import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../api/chat.api';
import { useKeyboardStore } from '../../stores/keyboard.store';
import { useCurrentSpace } from '../../contexts/space-context';
import { ChatMessage } from './chat-message';
import { ToolCallDisplay } from './tool-call-display';
import type { Message, Conversation } from '../../api/types';

interface ChatPanelProps {
  onClose: () => void;
}

interface StreamEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'complete' | 'error';
  data: string;
  toolName?: string;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamTokens, setStreamTokens] = useState('');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const setInputFocused = useKeyboardStore((s) => s.setInputFocused);
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();

  useEffect(() => {
    chatApi.listConversations(spaceId).then(setConversations);
  }, [spaceId]);

  useEffect(() => {
    if (activeConvId) {
      chatApi.getMessages(spaceId, activeConvId).then(setMessages);
    }
  }, [activeConvId, spaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamTokens]);

  async function handleSend() {
    if (!input.trim() || streaming) return;

    let convId = activeConvId;
    if (!convId) {
      const conv = await chatApi.createConversation(spaceId, input.slice(0, 50));
      convId = conv.id;
      setActiveConvId(conv.id);
      setConversations((prev) => [conv, ...prev]);
    }

    const userMsg = input;
    setInput('');
    setStreaming(true);
    setStreamTokens('');
    setStreamEvents([]);

    // Add user message to local state immediately
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, conversationId: convId!, role: 'user', content: userMsg, toolCallId: null, toolCalls: null, createdAt: new Date().toISOString(), position: prev.length },
    ]);

    controllerRef.current = chatApi.sendMessage(spaceId, convId!, userMsg, 'web', {
      onToken: (token) => setStreamTokens((prev) => prev + token),
      onToolCall: (name, args) => setStreamEvents((prev) => [...prev, { type: 'tool_call', data: args, toolName: name }]),
      onToolResult: (name, result) => setStreamEvents((prev) => [...prev, { type: 'tool_result', data: result, toolName: name }]),
      onComplete: () => {
        setStreaming(false);
        // Refresh messages from server to get persisted versions
        chatApi.getMessages(spaceId, convId!).then(setMessages);
        setStreamTokens('');
        setStreamEvents([]);
        // Invalidate all data queries since AI may have mutated data
        qc.invalidateQueries();
      },
      onError: (error) => {
        setStreaming(false);
        setStreamEvents((prev) => [...prev, { type: 'error', data: error }]);
      },
    });
  }

  const displayMessages = messages.filter((m) => m.role !== 'system');

  return (
    <aside className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto w-full md:w-96 shrink-0 flex flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-accent)]">AI Chat</h2>
        <div className="flex gap-2">
          {activeConvId && (
            <button
              onClick={() => { setActiveConvId(null); setMessages([]); }}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
            >
              New
            </button>
          )}
          <button onClick={onClose} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-error)]">
            Close
          </button>
        </div>
      </div>

      {!activeConvId ? (
        <div className="flex-1 overflow-auto p-3">
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">Conversations</p>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className="w-full text-left px-3 py-2 rounded text-sm hover:bg-[var(--color-bg-highlight)] text-[var(--color-text-primary)] mb-1"
            >
              {conv.title}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-[var(--color-text-secondary)]">No conversations yet. Type a message to start.</p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {displayMessages.map((msg) => (
            msg.role === 'tool' ? (
              <ToolCallDisplay key={msg.id} content={msg.content ?? ''} toolCallId={msg.toolCallId ?? ''} />
            ) : (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content ?? ''} />
            )
          ))}

          {streamEvents.map((event, i) => (
            event.type === 'tool_call' ? (
              <div key={i} className="text-xs text-[var(--color-accent-1)] font-mono">
                Calling: {event.toolName}
              </div>
            ) : event.type === 'tool_result' ? (
              <div key={i} className="text-xs text-[var(--color-success)] font-mono">
                Result: {event.data}
              </div>
            ) : event.type === 'error' ? (
              <div key={i} className="text-xs text-[var(--color-error)]">{event.data}</div>
            ) : null
          ))}

          {streamTokens && <ChatMessage role="assistant" content={streamTokens} streaming />}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the AI..."
            rows={2}
            className="flex-1 resize-none px-3 py-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-border-active)]"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="px-3 self-end rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] text-sm font-medium hover:opacity-90 disabled:opacity-50 h-9"
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
