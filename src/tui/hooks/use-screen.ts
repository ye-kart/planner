import { useState, useCallback } from 'react';
import { Screen, SCREEN_ORDER } from '../types.js';

export function useScreen(initial: Screen = Screen.Dashboard) {
  const [screen, setScreen] = useState<Screen>(initial);

  const goTo = useCallback((s: Screen) => setScreen(s), []);

  const next = useCallback(() => {
    setScreen(prev => {
      const idx = SCREEN_ORDER.indexOf(prev);
      return SCREEN_ORDER[(idx + 1) % SCREEN_ORDER.length]!;
    });
  }, []);

  const prev = useCallback(() => {
    setScreen(prev => {
      const idx = SCREEN_ORDER.indexOf(prev);
      return SCREEN_ORDER[(idx - 1 + SCREEN_ORDER.length) % SCREEN_ORDER.length]!;
    });
  }, []);

  return { screen, goTo, next, prev };
}
