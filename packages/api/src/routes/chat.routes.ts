import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import type { ApiContainer } from '../container.js';
import {
  createBillingAccessStatus,
  createFreeAccessStatus,
  getBillingConfig,
  type BillingConfig,
} from '../config/billing.js';

type ContainerGetter = (c: Context) => ApiContainer;
type UserIdGetter = (c: Context) => string | undefined;

const getContextUserId: UserIdGetter = (c) => (
  c as { get: (key: string) => unknown }
).get('userId') as string | undefined;

export function createChatRoutes(
  getContainer: ContainerGetter,
  billingConfig: BillingConfig = getBillingConfig(),
  getUserId: UserIdGetter = getContextUserId,
): Hono {
  const app = new Hono();

  app.get('/configured', (c) => {
    const { chatService, trialService } = getContainer(c);
    const userId = getUserId(c);
    const trial = userId
      ? billingConfig.enabled
        ? createBillingAccessStatus(trialService.getStatus(userId))
        : createFreeAccessStatus()
      : null;
    return c.json({
      configured: chatService.isConfigured(),
      trial,
    });
  });

  app.get('/conversations', (c) => {
    const { chatService } = getContainer(c);
    const conversations = chatService.listConversations();
    return c.json(conversations);
  });

  app.post('/conversations', async (c) => {
    const { chatService } = getContainer(c);
    const body = await c.req.json<{ title?: string }>().catch(() => ({} as { title?: string }));
    const conversation = chatService.createConversation(body.title);
    return c.json(conversation, 201);
  });

  app.delete('/conversations', (c) => {
    const { chatService } = getContainer(c);
    chatService.clearAllConversations();
    return c.json({ ok: true });
  });

  app.delete('/conversations/:id', (c) => {
    const { chatService } = getContainer(c);
    chatService.deleteConversation(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.get('/conversations/:id/messages', (c) => {
    const { chatService } = getContainer(c);
    const messages = chatService.getMessages(c.req.param('id'));
    return c.json(messages);
  });

  app.post('/conversations/:id/messages', (c) => {
    const { chatService, trialService } = getContainer(c);
    const userId = getUserId(c);
    if (billingConfig.enabled && userId) {
      const status = trialService.getStatus(userId);
      if (!status.hasAiAccess) {
        return c.json(
          {
            error: 'Trial expired. Please subscribe to continue using AI features.',
            trial: status,
          },
          402
        );
      }
    }
    return streamSSE(c, async (stream) => {
      let body: { message: string; currentScreen?: string };
      try {
        body = await c.req.json();
      } catch {
        await stream.writeSSE({ event: 'error', data: 'Invalid request body' });
        return;
      }

      const conversationId = c.req.param('id');
      const currentScreen = body.currentScreen ?? 'dashboard';

      // StreamCallbacks are sync, so writeSSE can't be awaited inline. Chain the
      // writes and await the tail: Hono closes the stream once this handler
      // returns, dropping any still-pending write — which silently ate every
      // terminal 'complete'/'error' event.
      let tail = Promise.resolve();
      const send = (event: string, data: string) => {
        tail = tail.then(() => stream.writeSSE({ event, data }));
      };

      await chatService.sendMessage(conversationId, body.message, currentScreen, {
        onToken: (token) => send('token', token),
        onToolCall: (name, args) => send('tool_call', JSON.stringify({ name, args })),
        onToolResult: (name, result) => send('tool_result', JSON.stringify({ name, result })),
        onComplete: (fullText) => send('complete', fullText),
        onError: (error) => send('error', error.message),
      });

      await tail;
    });
  });

  return app;
}
