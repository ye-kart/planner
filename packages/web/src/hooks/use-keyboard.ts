import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKeyboardStore } from '../stores/keyboard.store';
import { useThemeStore } from '../stores/theme.store';

const SCREEN_ROUTES = ['/', '/areas', '/goals', '/tasks', '/habits'];

export function useKeyboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { inputFocused, overlayOpen } = useKeyboardStore();
  const cycleTheme = useThemeStore((s) => s.cycleTheme);

  useEffect(() => {
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
        if (SCREEN_ROUTES[idx]) {
          navigate(SCREEN_ROUTES[idx]);
        }
        return;
      }

      // Tab / Shift+Tab for prev/next screen
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = SCREEN_ROUTES.indexOf(location.pathname);
        if (currentIdx === -1) return;
        const delta = e.shiftKey ? -1 : 1;
        const nextIdx = (currentIdx + delta + SCREEN_ROUTES.length) % SCREEN_ROUTES.length;
        navigate(SCREEN_ROUTES[nextIdx]);
        return;
      }

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
  }, [inputFocused, overlayOpen, navigate, location.pathname, cycleTheme]);
}
