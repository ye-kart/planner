import { api } from './client';
import type { Conversation, Message } from './types';

export const chatApi = {
  isConfigured: (spaceId: string) => api.get<{ configured: boolean }>(`/api/spaces/${spaceId}/chat/configured`),
  listConversations: (spaceId: string) => api.get<Conversation[]>(`/api/spaces/${spaceId}/chat/conversations`),
  createConversation: (spaceId: string, title?: string) => api.post<Conversation>(`/api/spaces/${spaceId}/chat/conversations`, { title }),
  deleteConversation: (spaceId: string, id: string) => api.delete(`/api/spaces/${spaceId}/chat/conversations/${id}`),
  clearAll: (spaceId: string) => api.delete(`/api/spaces/${spaceId}/chat/conversations`),
  getMessages: (spaceId: string, id: string) => api.get<Message[]>(`/api/spaces/${spaceId}/chat/conversations/${id}/messages`),

  sendMessage: (
    spaceId: string,
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

    fetch(`/api/spaces/${spaceId}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message, currentScreen }),
      signal: controller.signal,
    }).then(async (res) => {
      if (res.status === 402) {
        const body = await res.json().catch(() => ({ error: 'Trial expired. Please subscribe to continue.' }));
        callbacks.onError(body.error ?? 'Trial expired. Please subscribe to continue.');
        return;
      }
      if (!res.ok || !res.body) {
        callbacks.onError('Failed to connect to chat');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Dispatch one complete SSE event block. A block may carry multiple
      // `data:` lines (server splits a payload's newlines across them); they
      // must be rejoined with '\n' to reconstruct the original token/text.
      const dispatch = (block: string) => {
        let event = '';
        const dataParts: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) {
            event = line.slice(line.startsWith('event: ') ? 7 : 6);
          } else if (line.startsWith('data:')) {
            dataParts.push(line.slice(line.startsWith('data: ') ? 6 : 5));
          }
        }
        if (!event) return;
        const data = dataParts.join('\n');

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
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Events are separated by a blank line; everything up to the last
        // '\n\n' is complete, the remainder stays buffered for the next chunk.
        let sepIdx: number;
        while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          if (block.trim()) dispatch(block);
        }
      }
      if (buffer.trim()) dispatch(buffer);
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err.message);
      }
    });

    return controller;
  },
};
