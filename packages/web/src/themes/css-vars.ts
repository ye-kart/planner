import type { ColorTokens } from './tokens';

export const TOKEN_TO_VAR: Record<keyof ColorTokens, string> = {
  bg: '--color-bg',
  bgPanel: '--color-bg-panel',
  bgHighlight: '--color-bg-highlight',
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textAccent: '--color-text-accent',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  priorityLow: '--color-priority-low',
  priorityMed: '--color-priority-med',
  priorityHigh: '--color-priority-high',
  priorityUrgent: '--color-priority-urgent',
  accent1: '--color-accent-1',
  accent2: '--color-accent-2',
  streakFire: '--color-streak-fire',
  progressFill: '--color-progress-fill',
  progressTrack: '--color-progress-track',
  border: '--color-border',
  borderActive: '--color-border-active',
  tabActive: '--color-tab-active',
  tabInactive: '--color-tab-inactive',
};

export function applyTheme(tokens: ColorTokens): void {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(TOKEN_TO_VAR)) {
    root.style.setProperty(cssVar, tokens[key as keyof ColorTokens]);
  }
}
