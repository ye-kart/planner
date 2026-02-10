import { createContext } from 'react';
import type { Theme, ColorTokens } from './tokens.js';
import { neonTheme } from './neon.js';
import { matrixTheme } from './matrix.js';
import { purpleTheme } from './purple.js';

export type { Theme, ColorTokens };

export const themes: Record<string, Theme> = {
  neon: neonTheme,
  matrix: matrixTheme,
  purple: purpleTheme,
};

export const themeNames = Object.keys(themes) as string[];

export interface ThemeContextValue {
  theme: Theme;
  themeName: string;
  colors: ColorTokens;
  cycleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: neonTheme,
  themeName: 'neon',
  colors: neonTheme.colors,
  cycleTheme: () => {},
});
