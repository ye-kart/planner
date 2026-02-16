import { create } from 'zustand';

type ScreenMode = 'list' | 'detail' | 'add' | 'edit';

interface KeyboardState {
  inputFocused: boolean;
  overlayOpen: boolean;
  screenMode: ScreenMode;
  setInputFocused: (v: boolean) => void;
  setOverlayOpen: (v: boolean) => void;
  setScreenMode: (mode: ScreenMode) => void;
}

export const useKeyboardStore = create<KeyboardState>()((set) => ({
  inputFocused: false,
  overlayOpen: false,
  screenMode: 'list',
  setInputFocused: (v) => set({ inputFocused: v }),
  setOverlayOpen: (v) => set({ overlayOpen: v }),
  setScreenMode: (mode) => set({ screenMode: mode }),
}));
