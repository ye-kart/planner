import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useTheme } from '../hooks/use-theme.js';
import type { ChatService } from '../../services/chat.service.js';
import type { Screen } from '../types.js';

interface DisplayMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

interface ChatPanelProps {
  screen: Screen;
  chatService: ChatService;
  onClose: () => void;
  setInputActive: (active: boolean) => void;
  panelHeight: number;
}

export function ChatPanel({ screen, chatService, onClose, setInputActive, panelHeight }: ChatPanelProps) {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamingRef = useRef(false);

  // Track streaming state in ref for escape key handler
  useEffect(() => {
    streamingRef.current = streaming;
  }, [streaming]);

  // On mount: clear old conversations and start fresh
  useEffect(() => {
    setInputActive(true);

    if (!chatService.isConfigured()) {
      setError('AI not configured. Set PLANNER_AI_API_KEY env var.');
      return;
    }

    chatService.clearAllConversations();
    const conv = chatService.createConversation();
    setConversationId(conv.id);

    return () => {
      setInputActive(false);
    };
  }, []);

  // Handle Escape to close
  useInput((_input, key) => {
    if (key.escape && !streamingRef.current) {
      setInputActive(false);
      onClose();
    }
  });

  const handleSubmit = useCallback((value: string) => {
    if (!value.trim() || streaming || !conversationId) return;

    const userMsg = value.trim();
    setInput('');
    setDisplayMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);
    setStreamBuffer('');
    setError(null);

    chatService.sendMessage(conversationId, userMsg, screen, {
      onToken: (token: string) => {
        setStreamBuffer(prev => prev + token);
      },
      onToolCall: (name: string) => {
        setDisplayMessages(prev => [...prev, { role: 'tool', content: `Calling ${name}...` }]);
      },
      onToolResult: (name: string, result: string) => {
        setDisplayMessages(prev => {
          const updated = [...prev];
          // Replace the "Calling..." message with the result
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i]!.role === 'tool' && updated[i]!.content.startsWith(`Calling ${name}`)) {
              updated[i] = { role: 'tool', content: `${name}: ${result}` };
              break;
            }
          }
          return updated;
        });
      },
      onComplete: (fullText: string) => {
        if (fullText) {
          setDisplayMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
        }
        setStreamBuffer('');
        setStreaming(false);
      },
      onError: (err: Error) => {
        setError(err.message);
        setStreamBuffer('');
        setStreaming(false);
      },
    });
  }, [streaming, conversationId, screen, chatService]);

  // Calculate visible message area height (panel - border - input - header)
  const messageAreaHeight = Math.max(panelHeight - 4, 2);

  // Get visible messages (last N lines that fit)
  const allLines: { role: string; text: string }[] = [];
  for (const msg of displayMessages) {
    const prefix = msg.role === 'user' ? '> ' : msg.role === 'tool' ? '  ' : '< ';
    const lines = (msg.content || '').split('\n');
    for (const line of lines) {
      allLines.push({ role: msg.role, text: prefix + line });
    }
  }
  if (streamBuffer) {
    const lines = streamBuffer.split('\n');
    for (const line of lines) {
      allLines.push({ role: 'streaming', text: '< ' + line });
    }
  }
  const visibleLines = allLines.slice(-messageAreaHeight);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.borderActive}
      height={panelHeight}
      paddingX={1}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Text color={colors.accent1} bold>AI Chat</Text>
        <Box gap={1}>
          {streaming && <Text color={colors.warning}>thinking...</Text>}
          <Text color={colors.textSecondary}>Esc:close</Text>
        </Box>
      </Box>

      {/* Error */}
      {error && (
        <Box>
          <Text color={colors.error}>{error}</Text>
        </Box>
      )}

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, i) => (
          <Text
            key={i}
            color={
              line.role === 'user'
                ? colors.accent1
                : line.role === 'tool'
                  ? colors.textSecondary
                  : line.role === 'streaming'
                    ? colors.accent2
                    : colors.textPrimary
            }
            wrap="truncate"
          >
            {line.text}
          </Text>
        ))}
      </Box>

      {/* Input */}
      <Box>
        <Text color={colors.accent1} bold>{'> '}</Text>
        {streaming ? (
          <Text color={colors.textSecondary}>Thinking...</Text>
        ) : (
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Ask anything about your plans..."
          />
        )}
      </Box>
    </Box>
  );
}
