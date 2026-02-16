import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { ApiContainer } from '../container.js';

export function createChatRoutes(container: ApiContainer): Hono {
  const app = new Hono();
  const { chatService } = container;

  app.get('/configured', (c) => {
    return c.json({ configured: chatService.isConfigured() });
  });

  app.get('/conversations', (c) => {
    const conversations = chatService.listConversations();
    return c.json(conversations);
  });

  app.post('/conversations', async (c) => {
    const body = await c.req.json<{ title?: string }>().catch(() => ({} as { title?: string }));
    const conversation = chatService.createConversation(body.title);
    return c.json(conversation, 201);
  });

  app.delete('/conversations', (c) => {
    chatService.clearAllConversations();
    return c.json({ ok: true });
  });

  app.delete('/conversations/:id', (c) => {
    chatService.deleteConversation(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.get('/conversations/:id/messages', (c) => {
    const messages = chatService.getMessages(c.req.param('id'));
    return c.json(messages);
  });

  app.post('/conversations/:id/messages', (c) => {
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

      await chatService.sendMessage(conversationId, body.message, currentScreen, {
        onToken: (token) => {
          stream.writeSSE({ event: 'token', data: token });
        },
        onToolCall: (name, args) => {
          stream.writeSSE({ event: 'tool_call', data: JSON.stringify({ name, args }) });
        },
        onToolResult: (name, result) => {
          stream.writeSSE({ event: 'tool_result', data: JSON.stringify({ name, result }) });
        },
        onComplete: (fullText) => {
          stream.writeSSE({ event: 'complete', data: fullText });
        },
        onError: (error) => {
          stream.writeSSE({ event: 'error', data: error.message });
        },
      });
    });
  });

  return app;
}
