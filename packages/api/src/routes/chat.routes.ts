import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import type { ApiContainer } from '../container.js';

type ContainerGetter = (c: Context) => ApiContainer;

export function createChatRoutes(getContainer: ContainerGetter): Hono {
  const app = new Hono();

  app.get('/configured', (c) => {
    const { chatService } = getContainer(c);
    return c.json({ configured: chatService.isConfigured() });
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
    const { chatService } = getContainer(c);
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
