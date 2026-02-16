interface ChatMessageProps {
  role: string;
  content: string;
  streaming?: boolean;
}

export function ChatMessage({ role, content, streaming }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-[var(--color-accent-1)] text-[var(--color-bg)]'
            : 'bg-[var(--color-bg-highlight)] text-[var(--color-text-primary)]'
        }`}
      >
        {content}
        {streaming && <span className="animate-pulse ml-0.5">|</span>}
      </div>
    </div>
  );
}
