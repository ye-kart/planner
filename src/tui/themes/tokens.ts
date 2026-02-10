export interface ColorTokens {
  bg: string;
  bgPanel: string;
  bgHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  success: string;
  warning: string;
  error: string;
  priorityLow: string;
  priorityMed: string;
  priorityHigh: string;
  priorityUrgent: string;
  accent1: string;
  accent2: string;
  streakFire: string;
  progressFill: string;
  progressTrack: string;
  border: string;
  borderActive: string;
  tabActive: string;
  tabInactive: string;
}

export interface Theme {
  name: string;
  colors: ColorTokens;
}
