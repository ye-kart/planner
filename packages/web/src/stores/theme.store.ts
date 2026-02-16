import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { themes, themeNames } from '../themes/themes';
import { applyTheme } from '../themes/css-vars';
import type { Theme } from '../themes/tokens';

interface ThemeState {
  themeName: string;
  theme: Theme;
  cycleTheme: () => void;
  setTheme: (name: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeName: 'neon',
      theme: themes.neon,
      cycleTheme: () => {
        const idx = themeNames.indexOf(get().themeName);
        const next = themeNames[(idx + 1) % themeNames.length];
        const theme = themes[next];
        applyTheme(theme.colors);
        set({ themeName: next, theme });
      },
      setTheme: (name: string) => {
        const theme = themes[name] ?? themes.neon;
        applyTheme(theme.colors);
        set({ themeName: name, theme });
      },
    }),
    {
      name: 'planner-theme',
      partialize: (state) => ({ themeName: state.themeName }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const theme = themes[state.themeName] ?? themes.neon;
          state.theme = theme;
          applyTheme(theme.colors);
        }
      },
    },
  ),
);
