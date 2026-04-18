import { Hono } from 'hono';
import type { ApiContainer } from '../container.js';

export function createBillingRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { billingService, sessionRepo, userTrialRepo } = container;

  app.get('/status', (c) => {
    return c.json({ configured: !!billingService });
  });

  // --- Webhook (no auth — signature-verified) ---
  // Must run before any JSON body parsers; `c.req.text()` gives us the raw body.
  app.post('/webhook', async (c) => {
    if (!billingService) return c.json({ error: 'Billing not configured' }, 503);
    const signature = c.req.header('stripe-signature') ?? null;
    const body = await c.req.text();
    try {
      await billingService.handleWebhook(body, signature);
      return c.json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      console.error('[stripe webhook]', msg);
      return c.json({ error: msg }, 400);
    }
  });

  // --- Auth'd endpoints ---
  app.post('/checkout', async (c) => {
    if (!billingService) return c.json({ error: 'Billing not configured' }, 503);
    const userId = getUserId(c, sessionRepo);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json<{ plan?: 'monthly' | 'yearly' }>().catch(
      () => ({}) as { plan?: 'monthly' | 'yearly' }
    );
    const plan = body.plan;
    if (plan !== 'monthly' && plan !== 'yearly') {
      return c.json({ error: 'plan must be "monthly" or "yearly"' }, 400);
    }

    const baseUrl = getBaseUrl(c);
    const email = extractEmail(userId);
    try {
      const { url } = await billingService.createCheckoutSession(userId, plan, baseUrl, email);
      return c.json({ url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed';
      return c.json({ error: msg }, 500);
    }
  });

  app.post('/portal', async (c) => {
    if (!billingService) return c.json({ error: 'Billing not configured' }, 503);
    const userId = getUserId(c, sessionRepo);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const baseUrl = getBaseUrl(c);
    try {
      const { url } = await billingService.createPortalSession(userId, baseUrl);
      return c.json({ url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Portal failed';
      // Not-yet-subscribed is a 400, Stripe failures are 500.
      const status = msg.includes('subscribe first') ? 400 : 500;
      return c.json({ error: msg }, status);
    }
  });

  // Internal lightweight status readback for the web UI (does the user have
  // a subscription we'd want to expose a "Manage" button for?)
  app.get('/self', (c) => {
    const userId = getUserId(c, sessionRepo);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const trial = userTrialRepo.findByUserId(userId);
    return c.json({
      hasStripeCustomer: !!trial?.stripeCustomerId,
      subscriptionStatus: trial?.subscriptionStatus ?? null,
      plan: trial?.plan ?? null,
      subscriptionExpiresAt: trial?.subscriptionExpiresAt ?? null,
    });
  });

  return app;
}

function getUserId(
  c: { req: { header: (name: string) => string | undefined }; get: (key: string) => unknown },
  sessionRepo: ApiContainer['sessionRepo']
): string | null {
  // Preferred: set by auth middleware upstream.
  const viaCtx = (c as { get: (key: string) => unknown }).get('userId');
  if (typeof viaCtx === 'string') return viaCtx;

  // Fallback for deployments without auth middleware enabled (dev).
  const cookie = c.req.header('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]*)/);
  if (!match) return null;
  const session = sessionRepo.findById(match[1]);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  return session.userId;
}

function getBaseUrl(c: { req: { header: (name: string) => string | undefined } }): string {
  const proto = c.req.header('x-forwarded-proto') || 'http';
  const host = c.req.header('host') || 'localhost';
  return `${proto}://${host}`;
}

function extractEmail(userId: string): string | null {
  const [provider, username] = userId.split(':');
  if (provider === 'google' && username?.includes('@')) return username;
  return null;
}
