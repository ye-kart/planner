import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { KeyboardHintBar } from './keyboard-hint-bar';
import { ChatPanel } from '../chat/chat-panel';

export function AppLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    function handleToggleChat() {
      setChatOpen((prev) => !prev);
    }
    document.addEventListener('toggle-chat', handleToggleChat);
    return () => document.removeEventListener('toggle-chat', handleToggleChat);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
      <KeyboardHintBar />
    </div>
  );
}
