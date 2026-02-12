import { useInput } from 'ink';
import { Screen, SCREEN_KEYS } from '../types.js';

interface UseGlobalKeysOptions {
  onQuit: () => void;
  cycleTheme: () => void;
  goToScreen: (s: Screen) => void;
  nextScreen: () => void;
  prevScreen: () => void;
  openSearch: () => void;
  openChat: () => void;
  searchActive: boolean;
  inputActive: boolean;
  chatOpen: boolean;
}

export function useGlobalKeys(opts: UseGlobalKeysOptions): void {
  useInput((input, key) => {
    if (opts.searchActive || opts.inputActive || opts.chatOpen) return;

    if (input === 'q') {
      opts.onQuit();
      return;
    }
    if (input === 't') {
      opts.cycleTheme();
      return;
    }
    if (input === '/') {
      opts.openSearch();
      return;
    }
    if (input === 'c') {
      opts.openChat();
      return;
    }
    if (key.tab && key.shift) {
      opts.prevScreen();
      return;
    }
    if (key.tab) {
      opts.nextScreen();
      return;
    }
    const screen = SCREEN_KEYS[input];
    if (screen) {
      opts.goToScreen(screen);
    }
  });
}
