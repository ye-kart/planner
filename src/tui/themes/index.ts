import { createContext } from 'react';
import type { Theme, ColorTokens } from './tokens.js';
import { neonTheme } from './neon.js';
import { matrixTheme } from './matrix.js';
import { purpleTheme } from './purple.js';
import { emberTheme } from './ember.js';
import { frostTheme } from './frost.js';
import { sakuraTheme } from './sakura.js';
import { auroraTheme } from './aurora.js';

export type { Theme, ColorTokens };

export const themes: Record<string, Theme> = {
  neon: neonTheme,
  matrix: matrixTheme,
  purple: purpleTheme,
  ember: emberTheme,
  frost: frostTheme,
  sakura: sakuraTheme,
  aurora: auroraTheme,
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
