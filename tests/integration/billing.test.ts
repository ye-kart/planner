import { describe, it, expect, beforeEach, vi } from 'vitest';
import Stripe from 'stripe';
import { createTestDb } from './helpers/db.js';
import {
  UserTrialRepository,
  TrialService,
  AllowedUserRepository,
  type DB,
} from '@planner/core';
import { BillingService, type BillingConfig } from '@planner/api';

const TEST_WEBHOOK_SECRET = 'whsec_test_secret';
const PRICE_MONTHLY = 'price_test_monthly';
const PRICE_YEARLY = 'price_test_yearly';

const config: BillingConfig = {
  secretKey: 'sk_test_placeholder',
  webhookSecret: TEST_WEBHOOK_SECRET,
  priceMonthly: PRICE_MONTHLY,
  priceYearly: PRICE_YEARLY,
};

let db: DB;
let trialRepo: UserTrialRepository;
let trialService: TrialService;
let billing: BillingService;
let stripeForSigning: Stripe;

beforeEach(() => {
  db = createTestDb();
  trialRepo = new UserTrialRepository(db);
  const allowedUserRepo = new AllowedUserRepository(db);
  trialService = new TrialService(trialRepo, allowedUserRepo);
  billing = new BillingService(trialRepo, config);
  stripeForSigning = new Stripe(config.secretKey);

  // Seed a trial row so we have something to mark active/cancelled.
  trialService.ensureTrial('github:alice');
  trialRepo.update('github:alice', {
    stripeCustomerId: 'cus_test_123',
    updatedAt: new Date().toISOString(),
  });
});

function signedRequest(payload: unknown): { body: string; signature: string } {
  const body = JSON.stringify(payload);
  const signature = stripeForSigning.webhooks.generateTestHeaderString({
    payload: body,
    secret: TEST_WEBHOOK_SECRET,
  });
  return { body, signature };
}

function stripeSubscription(overrides: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  const periodEnd = Math.floor(new Date('2026-05-19T00:00:00Z').getTime() / 1000);
  return {
    id: 'sub_test_1',
    object: 'subscription',
    customer: 'cus_test_123',
    status: 'active',
    items: {
      object: 'list',
      data: [
        {
          id: 'si_1',
          price: { id: PRICE_MONTHLY, object: 'price' } as Stripe.Price,
          current_period_end: periodEnd,
          current_period_start: periodEnd - 30 * 24 * 60 * 60,
        } as unknown as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: '',
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe('BillingService webhook handling', () => {
  it('rejects requests with an invalid signature', async () => {
    const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } });
    await expect(billing.handleWebhook(body, 'invalid-signature')).rejects.toThrow();
  });

  it('marks a user active on customer.subscription.updated (monthly plan)', async () => {
    const subscription = stripeSubscription();
    const { body, signature } = signedRequest({
      id: 'evt_1',
      object: 'event',
      type: 'customer.subscription.updated',
      data: { object: subscription },
    });

    await billing.handleWebhook(body, signature);

    const trial = trialRepo.findByUserId('github:alice')!;
    expect(trial.subscriptionStatus).toBe('active');
    expect(trial.stripeSubscriptionId).toBe('sub_test_1');
    expect(trial.plan).toBe('monthly');
    expect(trial.subscriptionExpiresAt).toBe('2026-05-19T00:00:00.000Z');

    // And TrialService should now grant access even past the 7-day trial window.
    const status = trialService.getStatus('github:alice', new Date('2026-04-30T00:00:00Z'));
    expect(status.state).toBe('active');
    expect(status.hasAiAccess).toBe(true);
    expect(status.plan).toBe('monthly');
  });

  it('resolves yearly plan by price ID', async () => {
    const sub = stripeSubscription({
      items: {
        object: 'list',
        data: [
          {
            id: 'si_2',
            price: { id: PRICE_YEARLY, object: 'price' } as Stripe.Price,
            current_period_end: Math.floor(new Date('2027-04-19T00:00:00Z').getTime() / 1000),
            current_period_start: Math.floor(new Date('2026-04-19T00:00:00Z').getTime() / 1000),
          } as unknown as Stripe.SubscriptionItem,
        ],
        has_more: false,
        url: '',
      } as Stripe.Subscription['items'],
    });
    const { body, signature } = signedRequest({
      id: 'evt_2',
      object: 'event',
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    await billing.handleWebhook(body, signature);
    expect(trialRepo.findByUserId('github:alice')!.plan).toBe('yearly');
  });

  it('flips status to cancelled on customer.subscription.deleted', async () => {
    trialRepo.update('github:alice', {
      subscriptionStatus: 'active',
      plan: 'monthly',
      updatedAt: new Date().toISOString(),
    });

    const sub = stripeSubscription({ status: 'canceled' });
    const { body, signature } = signedRequest({
      id: 'evt_3',
      object: 'event',
      type: 'customer.subscription.deleted',
      data: { object: sub },
    });

    await billing.handleWebhook(body, signature);
    expect(trialRepo.findByUserId('github:alice')!.subscriptionStatus).toBe('cancelled');
  });

  it('marks past_due on invoice.payment_failed', async () => {
    const { body, signature } = signedRequest({
      id: 'evt_4',
      object: 'event',
      type: 'invoice.payment_failed',
      data: { object: { id: 'in_1', object: 'invoice', customer: 'cus_test_123' } },
    });

    await billing.handleWebhook(body, signature);
    expect(trialRepo.findByUserId('github:alice')!.subscriptionStatus).toBe('past_due');
  });

  it('looks up user via stripe_customer_id, not metadata', async () => {
    // github:bob has no stripe_customer_id → the event targets alice's customer.
    const sub = stripeSubscription();
    const { body, signature } = signedRequest({
      id: 'evt_5',
      object: 'event',
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    await billing.handleWebhook(body, signature);

    // Alice was updated (matched via her stripe_customer_id)
    expect(trialRepo.findByUserId('github:alice')!.subscriptionStatus).toBe('active');
  });
});

describe('BillingService checkout + portal', () => {
  it('creates a stripe customer on first checkout and reuses it', async () => {
    trialService.ensureTrial('github:new-user');

    // Stripe's SDK attaches resources per-instance, so stub the actual
    // instance our BillingService is holding.
    const stripeInstance = (billing as unknown as { stripe: Stripe }).stripe;
    const createCustomer = vi
      .spyOn(stripeInstance.customers, 'create')
      .mockResolvedValue({ id: 'cus_freshly_created' } as Stripe.Customer);
    const createSession = vi
      .spyOn(stripeInstance.checkout.sessions, 'create')
      .mockResolvedValue({ url: 'https://checkout.stripe.com/test' } as Stripe.Checkout.Session);

    const { url } = await billing.createCheckoutSession(
      'github:new-user',
      'monthly',
      'https://example.com',
      null
    );
    expect(url).toBe('https://checkout.stripe.com/test');
    expect(createCustomer).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_freshly_created',
        line_items: [{ price: PRICE_MONTHLY, quantity: 1 }],
      })
    );

    expect(trialRepo.findByUserId('github:new-user')!.stripeCustomerId).toBe(
      'cus_freshly_created'
    );

    createCustomer.mockClear();
    await billing.createCheckoutSession('github:new-user', 'yearly', 'https://example.com', null);
    expect(createCustomer).not.toHaveBeenCalled();

    createCustomer.mockRestore();
    createSession.mockRestore();
  });

  it('refuses to open the portal without an existing stripe customer', async () => {
    trialService.ensureTrial('github:no-customer');
    await expect(
      billing.createPortalSession('github:no-customer', 'https://example.com')
    ).rejects.toThrow(/subscribe first/i);
  });
});
