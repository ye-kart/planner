import { api } from './client';
import type { Conversation, Message } from './types';

export const chatApi = {
  isConfigured: () => api.get<{ configured: boolean }>('/api/chat/configured'),
  listConversations: () => api.get<Conversation[]>('/api/chat/conversations'),
  createConversation: (title?: string) => api.post<Conversation>('/api/chat/conversations', { title }),
  deleteConversation: (id: string) => api.delete(`/api/chat/conversations/${id}`),
  clearAll: () => api.delete('/api/chat/conversations'),
  getMessages: (id: string) => api.get<Message[]>(`/api/chat/conversations/${id}/messages`),

  sendMessage: (
    conversationId: string,
    message: string,
    currentScreen: string,
    callbacks: {
      onToken: (token: string) => void;
      onToolCall: (name: string, args: string) => void;
      onToolResult: (name: string, result: string) => void;
      onComplete: (fullText: string) => void;
      onError: (error: string) => void;
    },
  ): AbortController => {
    const controller = new AbortController();

    fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, currentScreen }),
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) {
        callbacks.onError('Failed to connect to chat');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7);
            const dataLine = lines[lines.indexOf(line) + 1];
            if (!dataLine?.startsWith('data: ')) continue;
            const data = dataLine.slice(6);

            switch (event) {
              case 'token':
                callbacks.onToken(data);
                break;
              case 'tool_call': {
                const tc = JSON.parse(data);
                callbacks.onToolCall(tc.name, tc.args);
                break;
              }
              case 'tool_result': {
                const tr = JSON.parse(data);
                callbacks.onToolResult(tr.name, tr.result);
                break;
              }
              case 'complete':
                callbacks.onComplete(data);
                break;
              case 'error':
                callbacks.onError(data);
                break;
            }
          }
        }
      }
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err.message);
      }
    });

    return controller;
  },
};
