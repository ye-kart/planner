import { describe, it, expect, vi } from 'vitest';
import { createChatRoutes } from '../../packages/api/src/routes/chat.routes';

interface Callbacks {
  onToken: (token: string) => void;
  onToolCall: (name: string, args: string) => void;
  onToolResult: (name: string, result: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

type SendMessage = (id: string, message: string, screen: string, cb: Callbacks) => Promise<void>;

// Minimal stand-in for ApiContainer — these routes only reach for chatService.
function routesWith(
  sendMessage: SendMessage,
  options?: { billingEnabled?: boolean; userId?: string },
) {
  const getContainer = () => ({
    chatService: { sendMessage },
    trialService: {
      getStatus: () => ({
        state: 'trial_expired',
        trialStartedAt: null,
        trialExpiresAt: null,
        subscriptionExpiresAt: null,
        plan: null,
        daysRemaining: 0,
        hasAiAccess: false,
      }),
    },
  });
  const routes = createChatRoutes(
    getContainer as unknown as Parameters<typeof createChatRoutes>[0],
    { enabled: options?.billingEnabled ?? false },
    () => options?.userId,
  );
  return routes;
}

async function post(app: ReturnType<typeof createChatRoutes>) {
  const res = await app.request('/conversations/c1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'hi', currentScreen: 'web' }),
  });
  return res.text();
}

describe('chat SSE stream', () => {
  // Regression: writeSSE was fired without await, so Hono closed the stream
  // before the terminal event flushed and the client received an empty body.
  it('delivers a terminal error event', async () => {
    const app = routesWith(async (_id, _m, _s, cb) => cb.onError(new Error('API error: boom')));
    const body = await post(app);

    expect(body).toContain('event: error');
    expect(body).toContain('API error: boom');
  });

  it('delivers the terminal complete event after streamed tokens', async () => {
    const app = routesWith(async (_id, _m, _s, cb) => {
      for (const token of ['Hel', 'lo']) {
        cb.onToken(token);
        await new Promise((r) => setTimeout(r, 5)); // network gap between chunks
      }
      cb.onComplete('Hello');
    });
    const body = await post(app);

    expect(body).toContain('data: Hel');
    expect(body).toContain('event: complete');
    expect(body).toContain('data: Hello');
  });

  it('preserves event ordering across the chained writes', async () => {
    const app = routesWith(async (_id, _m, _s, cb) => {
      cb.onToolCall('list_tasks', '{}');
      cb.onToolResult('list_tasks', '3 tasks');
      cb.onComplete('done');
    });
    const body = await post(app);

    expect(body.indexOf('tool_call')).toBeLessThan(body.indexOf('tool_result'));
    expect(body.indexOf('tool_result')).toBeLessThan(body.indexOf('event: complete'));
  });

  it('allows an expired user to chat when billing is disabled', async () => {
    const sendMessage = vi.fn<SendMessage>(async (_id, _m, _s, cb) => cb.onComplete('free access'));
    const app = routesWith(sendMessage, { userId: 'github:alice' });

    const body = await post(app);

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(body).toContain('data: free access');
  });

  it('preserves the 402 gate when billing is explicitly enabled', async () => {
    const sendMessage = vi.fn<SendMessage>();
    const app = routesWith(sendMessage, { billingEnabled: true, userId: 'github:alice' });

    const response = await app.request('/conversations/c1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi', currentScreen: 'web' }),
    });

    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('Trial expired') });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
