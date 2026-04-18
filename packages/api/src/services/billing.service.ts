import Stripe from 'stripe';
import { ValidationError, type UserTrialRepository } from '@planner/core';

export interface BillingConfig {
  secretKey: string;
  webhookSecret: string;
  priceMonthly: string;
  priceYearly: string;
}

export function readBillingConfig(): BillingConfig | null {
  const secretKey = process.env.PLANNER_STRIPE_SECRET_KEY;
  const webhookSecret = process.env.PLANNER_STRIPE_WEBHOOK_SECRET;
  const priceMonthly = process.env.PLANNER_STRIPE_PRICE_MONTHLY;
  const priceYearly = process.env.PLANNER_STRIPE_PRICE_YEARLY;
  if (!secretKey || !webhookSecret || !priceMonthly || !priceYearly) {
    return null;
  }
  return { secretKey, webhookSecret, priceMonthly, priceYearly };
}

export type Plan = 'monthly' | 'yearly';

export class BillingService {
  private stripe: Stripe;

  constructor(
    private trialRepo: UserTrialRepository,
    private config: BillingConfig
  ) {
    this.stripe = new Stripe(config.secretKey);
  }

  isConfigured(): boolean {
    return true;
  }

  async createCheckoutSession(
    userId: string,
    plan: Plan,
    baseUrl: string,
    email: string | null
  ): Promise<{ url: string }> {
    const price = plan === 'monthly' ? this.config.priceMonthly : this.config.priceYearly;
    const customerId = await this.ensureCustomer(userId, email);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${baseUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscribe`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { userId, plan },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return { url: session.url };
  }

  async createPortalSession(userId: string, baseUrl: string): Promise<{ url: string }> {
    const trial = this.trialRepo.findByUserId(userId);
    if (!trial?.stripeCustomerId) {
      throw new ValidationError('No Stripe customer — subscribe first before managing billing.');
    }
    const session = await this.stripe.billingPortal.sessions.create({
      customer: trial.stripeCustomerId,
      return_url: `${baseUrl}/subscribe`,
    });
    return { url: session.url };
  }

  // Verifies the signature, then dispatches to internal handlers.
  async handleWebhook(rawBody: string, signature: string | null): Promise<void> {
    if (!signature) throw new ValidationError('Missing stripe-signature header');
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.webhookSecret
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Ignore everything else — we don't need it for the trial gate.
        break;
    }
  }

  private async ensureCustomer(userId: string, email: string | null): Promise<string> {
    const trial = this.trialRepo.findByUserId(userId);
    if (trial?.stripeCustomerId) return trial.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email: email ?? undefined,
      metadata: { userId },
    });

    this.trialRepo.update(userId, {
      stripeCustomerId: customer.id,
      updatedAt: new Date().toISOString(),
    });
    return customer.id;
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId =
      (session.metadata?.userId as string | undefined) ??
      (session.client_reference_id as string | undefined);
    if (!userId) return;
    if (!session.subscription) return;

    const subId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
    const subscription = await this.stripe.subscriptions.retrieve(subId);
    this.applySubscription(userId, subscription);
  }

  private async onSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserId(subscription.customer);
    if (!userId) return;
    this.applySubscription(userId, subscription);
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserId(subscription.customer);
    if (!userId) return;
    this.trialRepo.update(userId, {
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date().toISOString(),
    });
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.customer) return;
    const userId = await this.resolveUserId(invoice.customer);
    if (!userId) return;
    this.trialRepo.update(userId, {
      subscriptionStatus: 'past_due',
      updatedAt: new Date().toISOString(),
    });
  }

  private applySubscription(userId: string, subscription: Stripe.Subscription): void {
    const item = subscription.items.data[0];
    const priceId = item?.price.id ?? null;
    const plan: Plan | null =
      priceId === this.config.priceYearly
        ? 'yearly'
        : priceId === this.config.priceMonthly
          ? 'monthly'
          : null;

    const periodEndSec = subscription.items.data[0]?.current_period_end ?? null;
    const expiresAt = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;

    const status: 'active' | 'cancelled' | 'past_due' =
      subscription.status === 'active' || subscription.status === 'trialing'
        ? 'active'
        : subscription.status === 'past_due'
          ? 'past_due'
          : 'cancelled';

    this.trialRepo.update(userId, {
      subscriptionStatus: status,
      stripeSubscriptionId: subscription.id,
      plan,
      subscriptionExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    });
  }

  private async resolveUserId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer
  ): Promise<string | null> {
    const customerId = typeof customer === 'string' ? customer : customer.id;
    const trial = this.trialRepo.findByStripeCustomerId(customerId);
    if (trial) return trial.userId;

    // Fallback: read metadata off the Stripe customer
    const fetched = await this.stripe.customers.retrieve(customerId);
    if (fetched.deleted) return null;
    return (fetched.metadata?.userId as string | undefined) ?? null;
  }
}
