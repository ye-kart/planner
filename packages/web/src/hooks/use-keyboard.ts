import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useKeyboardStore } from '../stores/keyboard.store';
import { useThemeStore } from '../stores/theme.store';

const SCREEN_SUFFIXES = ['', '/areas', '/goals', '/tasks', '/habits'];

export function useKeyboard() {
  const navigate = useNavigate();
  const location = useLocation();
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

      // Tab / Shift+Tab for prev/next screen
      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = screenRoutes.indexOf(location.pathname);
        if (currentIdx === -1) return;
        const delta = e.shiftKey ? -1 : 1;
        const nextIdx = (currentIdx + delta + screenRoutes.length) % screenRoutes.length;
        navigate(screenRoutes[nextIdx]);
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
  }, [inputFocused, overlayOpen, navigate, location.pathname, cycleTheme, spaceId]);
}
