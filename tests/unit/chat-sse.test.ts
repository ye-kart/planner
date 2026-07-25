import { describe, it, expect } from 'vitest';
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
function routesWith(sendMessage: SendMessage) {
  const getContainer = () => ({ chatService: { sendMessage } });
  return createChatRoutes(getContainer as unknown as Parameters<typeof createChatRoutes>[0]);
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
});
