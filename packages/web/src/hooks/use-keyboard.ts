import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useKeyboardStore } from '../stores/keyboard.store';
import { useThemeStore } from '../stores/theme.store';

const SCREEN_SUFFIXES = ['', '/areas', '/goals', '/tasks', '/habits'];

export function useKeyboard() {
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const { inputFocused, overlayOpen } = useKeyboardStore();
  const cycleTheme = useThemeStore((s) => s.cycleTheme);

  useEffect(() => {
    if (!spaceId) return;

    const basePath = `/spaces/${spaceId}`;
    const screenRoutes = SCREEN_SUFFIXES.map(s => basePath + s);

    function handleKeyDown(e: KeyboardEvent) {
      // Never capture when input is focused
      if (inputFocused) return;

      // Close overlay on Escape
      if (e.key === 'Escape' && overlayOpen) {
        useKeyboardStore.getState().setOverlayOpen(false);
        return;
      }

      // Don't capture shortcuts when overlay is open (except Escape above)
      if (overlayOpen) return;

      // Screen navigation: 1-5
      if (e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key) - 1;
        if (screenRoutes[idx]) {
          navigate(screenRoutes[idx]);
        }
        return;
      }

      // Note: bare Tab is intentionally NOT captured for screen switching —
      // doing so would suppress native focus traversal (WCAG 2.1.1). Use the
      // 1-5 shortcuts (or the sidebar) to switch screens.

      // Theme toggle
      if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
        cycleTheme();
        return;
      }

      // Chat toggle
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        document.dispatchEvent(new CustomEvent('toggle-chat'));
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [inputFocused, overlayOpen, navigate, cycleTheme, spaceId]);
}
