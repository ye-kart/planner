import type { Theme } from './tokens';

export const neonTheme: Theme = {
  name: 'neon',
  colors: {
    bg: '#0a0a1a', bgPanel: '#111128', bgHighlight: '#1a1a3e',
    textPrimary: '#e0e0ff', textSecondary: '#7777aa', textAccent: '#00d4ff',
    success: '#00ff88', warning: '#ffaa00', error: '#ff3366',
    priorityLow: '#4488cc', priorityMed: '#00d4ff', priorityHigh: '#ff6600', priorityUrgent: '#ff3366',
    accent1: '#00d4ff', accent2: '#ff44aa', streakFire: '#ff6600',
    progressFill: '#00d4ff', progressTrack: '#222244',
    border: '#333366', borderActive: '#00d4ff', tabActive: '#00d4ff', tabInactive: '#444477',
  },
};

export const matrixTheme: Theme = {
  name: 'matrix',
  colors: {
    bg: '#000000', bgPanel: '#001100', bgHighlight: '#002200',
    textPrimary: '#00ff00', textSecondary: '#006600', textAccent: '#00ff66',
    success: '#00ff00', warning: '#ccff00', error: '#ff0000',
    priorityLow: '#004400', priorityMed: '#00aa00', priorityHigh: '#ccff00', priorityUrgent: '#ff0000',
    accent1: '#00ff66', accent2: '#33ff99', streakFire: '#ccff00',
    progressFill: '#00ff00', progressTrack: '#003300',
    border: '#004400', borderActive: '#00ff66', tabActive: '#00ff66', tabInactive: '#228844',
  },
};

export const purpleTheme: Theme = {
  name: 'purple',
  colors: {
    bg: '#1a0a2e', bgPanel: '#220e3d', bgHighlight: '#2d1550',
    textPrimary: '#e8d5ff', textSecondary: '#9966cc', textAccent: '#cc88ff',
    success: '#66ff99', warning: '#ffcc44', error: '#ff5555',
    priorityLow: '#7744aa', priorityMed: '#9966cc', priorityHigh: '#ff8844', priorityUrgent: '#ff5555',
    accent1: '#cc88ff', accent2: '#ff88cc', streakFire: '#ff8844',
    progressFill: '#cc88ff', progressTrack: '#2d1550',
    border: '#442266', borderActive: '#cc88ff', tabActive: '#cc88ff', tabInactive: '#7755aa',
  },
};

export const emberTheme: Theme = {
  name: 'ember',
  colors: {
    bg: '#1a0800', bgPanel: '#261200', bgHighlight: '#331a00',
    textPrimary: '#ffe8cc', textSecondary: '#aa7744', textAccent: '#ff8c00',
    success: '#44dd44', warning: '#ffcc00', error: '#ff4444',
    priorityLow: '#886633', priorityMed: '#cc8833', priorityHigh: '#ff6622', priorityUrgent: '#ff3333',
    accent1: '#ff8c00', accent2: '#ff4444', streakFire: '#ffaa00',
    progressFill: '#ff8c00', progressTrack: '#331a00',
    border: '#553311', borderActive: '#ff8c00', tabActive: '#ff8c00', tabInactive: '#886644',
  },
};

export const frostTheme: Theme = {
  name: 'frost',
  colors: {
    bg: '#0a0e1a', bgPanel: '#0f1526', bgHighlight: '#151d33',
    textPrimary: '#d8e8ff', textSecondary: '#5577aa', textAccent: '#88ccff',
    success: '#55ddaa', warning: '#ffcc55', error: '#ff5566',
    priorityLow: '#4477aa', priorityMed: '#5599cc', priorityHigh: '#ffaa44', priorityUrgent: '#ff5566',
    accent1: '#88ccff', accent2: '#aaddff', streakFire: '#ffaa44',
    progressFill: '#88ccff', progressTrack: '#1a2540',
    border: '#2a3a55', borderActive: '#88ccff', tabActive: '#88ccff', tabInactive: '#446688',
  },
};

export const sakuraTheme: Theme = {
  name: 'sakura',
  colors: {
    bg: '#1a0a10', bgPanel: '#220e18', bgHighlight: '#2d1522',
    textPrimary: '#ffe8ee', textSecondary: '#aa6677', textAccent: '#ff88aa',
    success: '#88dd88', warning: '#ffcc55', error: '#ff4455',
    priorityLow: '#885566', priorityMed: '#cc7788', priorityHigh: '#ff8855', priorityUrgent: '#ff4455',
    accent1: '#ff88aa', accent2: '#ffaacc', streakFire: '#ff8855',
    progressFill: '#ff88aa', progressTrack: '#2d1522',
    border: '#553344', borderActive: '#ff88aa', tabActive: '#ff88aa', tabInactive: '#885566',
  },
};

export const auroraTheme: Theme = {
  name: 'aurora',
  colors: {
    bg: '#050510', bgPanel: '#0a0a20', bgHighlight: '#10102e',
    textPrimary: '#d0e0ff', textSecondary: '#6677aa', textAccent: '#44ffaa',
    success: '#44ffaa', warning: '#ffdd44', error: '#ff4466',
    priorityLow: '#4488aa', priorityMed: '#44bbcc', priorityHigh: '#ff8844', priorityUrgent: '#ff4466',
    accent1: '#44ffaa', accent2: '#aa44ff', streakFire: '#ff8844',
    progressFill: '#44ffaa', progressTrack: '#112233',
    border: '#334466', borderActive: '#44ffaa', tabActive: '#44ffaa', tabInactive: '#446677',
  },
};

export const themes: Record<string, Theme> = {
  neon: neonTheme, matrix: matrixTheme, purple: purpleTheme,
  ember: emberTheme, frost: frostTheme, sakura: sakuraTheme, aurora: auroraTheme,
};

export const themeNames = Object.keys(themes);
