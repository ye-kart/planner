import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { KeyboardHintBar } from './keyboard-hint-bar';
import { ChatPanel } from '../chat/chat-panel';
import { MobileHeader } from './mobile-header';

export function AppLayout() {
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    function handleToggleChat() {
      setChatOpen((prev) => !prev);
    }
    document.addEventListener('toggle-chat', handleToggleChat);
    return () => document.removeEventListener('toggle-chat', handleToggleChat);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('nav a, nav button') && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [sidebarOpen]);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <MobileHeader
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        onChatToggle={() => setChatOpen((prev) => !prev)}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
      <KeyboardHintBar />
    </div>
  );
}
