import { Screen, SCREEN_ORDER, SCREEN_KEYS, SCREEN_LABELS } from '../../src/tui/types.js';
import { themes, themeNames } from '../../src/tui/themes/index.js';
import type { ColorTokens } from '../../src/tui/themes/tokens.js';

describe('TUI types', () => {
  it('has 5 screens in order', () => {
    expect(SCREEN_ORDER).toHaveLength(5);
    expect(SCREEN_ORDER).toEqual([
      Screen.Dashboard,
      Screen.Areas,
      Screen.Goals,
      Screen.Tasks,
      Screen.Habits,
    ]);
  });

  it('maps keys 1-5 to screens', () => {
    expect(Object.keys(SCREEN_KEYS)).toHaveLength(5);
    expect(SCREEN_KEYS['1']).toBe(Screen.Dashboard);
    expect(SCREEN_KEYS['2']).toBe(Screen.Areas);
    expect(SCREEN_KEYS['3']).toBe(Screen.Goals);
    expect(SCREEN_KEYS['4']).toBe(Screen.Tasks);
    expect(SCREEN_KEYS['5']).toBe(Screen.Habits);
  });

  it('has labels for all screens', () => {
    for (const screen of SCREEN_ORDER) {
      expect(SCREEN_LABELS[screen]).toBeDefined();
      expect(typeof SCREEN_LABELS[screen]).toBe('string');
      expect(SCREEN_LABELS[screen]!.length).toBeGreaterThan(0);
    }
  });
});

describe('TUI themes', () => {
  const requiredTokens: (keyof ColorTokens)[] = [
    'bg', 'bgPanel', 'bgHighlight',
    'textPrimary', 'textSecondary', 'textAccent',
    'success', 'warning', 'error',
    'priorityLow', 'priorityMed', 'priorityHigh', 'priorityUrgent',
    'accent1', 'accent2',
    'streakFire', 'progressFill', 'progressTrack',
    'border', 'borderActive',
    'tabActive', 'tabInactive',
  ];

  it('has 3 themes registered', () => {
    expect(themeNames).toHaveLength(3);
    expect(themeNames).toContain('neon');
    expect(themeNames).toContain('matrix');
    expect(themeNames).toContain('purple');
  });

  for (const name of ['neon', 'matrix', 'purple']) {
    describe(`${name} theme`, () => {
      it('has a name property', () => {
        expect(themes[name]!.name).toBe(name);
      });

      it('has all required color tokens', () => {
        const colors = themes[name]!.colors;
        for (const token of requiredTokens) {
          expect(colors[token]).toBeDefined();
          expect(typeof colors[token]).toBe('string');
          expect(colors[token]!.length).toBeGreaterThan(0);
        }
      });

      it('all color tokens are valid hex colors', () => {
        const colors = themes[name]!.colors;
        for (const token of requiredTokens) {
          expect(colors[token]).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
      });
    });
  }
});
