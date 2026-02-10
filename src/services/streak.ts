import { addDays, dayOfWeek, isoWeek, today as getToday } from '../utils/date.js';

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
}

/**
 * Calculate streaks from a sorted list of completion dates (newest first).
 * Pure function — no side effects.
 */
export function calculateStreaks(
  completionDates: string[],
  frequency: 'daily' | 'weekly' | 'specific_days',
  days: number[] | null,
  todayDate?: string,
): StreakResult {
  if (completionDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const td = todayDate ?? getToday();

  switch (frequency) {
    case 'daily':
      return calculateDailyStreak(completionDates, td);
    case 'weekly':
      return calculateWeeklyStreak(completionDates, td);
    case 'specific_days':
      return calculateSpecificDaysStreak(completionDates, days ?? [], td);
  }
}

function calculateDailyStreak(dates: string[], td: string): StreakResult {
  const dateSet = new Set(dates);

  // Current streak: count consecutive days backward from today (grace: yesterday counts)
  let currentStreak = 0;
  let checkDate = td;

  if (!dateSet.has(checkDate)) {
    // Grace: allow yesterday
    checkDate = addDays(td, -1);
    if (!dateSet.has(checkDate)) {
      // No current streak, but still calculate best
      return { currentStreak: 0, bestStreak: calculateBestDailyStreak(dates) };
    }
  }

  while (dateSet.has(checkDate)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  const bestStreak = Math.max(currentStreak, calculateBestDailyStreak(dates));
  return { currentStreak, bestStreak };
}

function calculateBestDailyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  // Sort ascending
  const sorted = [...dates].sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const diff = dayDiff(sorted[i - 1], sorted[i]);
    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else if (diff > 1) {
      current = 1;
    }
    // diff === 0 means duplicate date, skip
  }

  return best;
}

function calculateWeeklyStreak(dates: string[], td: string): StreakResult {
  const weekSet = new Set(dates.map(d => isoWeek(d)));
  const currentWeek = isoWeek(td);

  // Current streak
  let currentStreak = 0;
  let checkWeek = currentWeek;

  if (!weekSet.has(checkWeek)) {
    // Grace: allow previous week
    checkWeek = isoWeek(addDays(td, -7));
    if (!weekSet.has(checkWeek)) {
      return { currentStreak: 0, bestStreak: calculateBestWeeklyStreak(dates) };
    }
  }

  // Walk backward through weeks
  // Use a date pointer that we move back 7 days at a time
  let datePointer = checkWeek === currentWeek ? td : addDays(td, -7);
  while (weekSet.has(isoWeek(datePointer))) {
    currentStreak++;
    datePointer = addDays(datePointer, -7);
  }

  const bestStreak = Math.max(currentStreak, calculateBestWeeklyStreak(dates));
  return { currentStreak, bestStreak };
}

function calculateBestWeeklyStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const weeks = [...new Set(dates.map(d => isoWeek(d)))].sort();
  if (weeks.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < weeks.length; i++) {
    if (areConsecutiveWeeks(weeks[i - 1], weeks[i])) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

function calculateSpecificDaysStreak(dates: string[], scheduledDays: number[], td: string): StreakResult {
  if (scheduledDays.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const dateSet = new Set(dates);
  const scheduledDaySet = new Set(scheduledDays);

  // Find all scheduled dates going backward from today
  let currentStreak = 0;
  let checkDate = td;
  let started = false;
  let graceUsed = false;

  // Walk backward up to a reasonable limit (365 days)
  for (let i = 0; i < 365; i++) {
    if (scheduledDaySet.has(dayOfWeek(checkDate))) {
      if (dateSet.has(checkDate)) {
        currentStreak++;
        started = true;
      } else if (started) {
        break;
      } else if (!graceUsed) {
        // Grace: the most recent scheduled day can be missing
        // (today or the last scheduled day if today isn't one)
        graceUsed = true;
      } else {
        break;
      }
    }
    checkDate = addDays(checkDate, -1);
  }

  // Best streak: walk through all dates
  const bestStreak = Math.max(currentStreak, calculateBestSpecificDaysStreak(dates, scheduledDays));
  return { currentStreak, bestStreak };
}

function calculateBestSpecificDaysStreak(dates: string[], scheduledDays: number[]): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort();
  const dateSet = new Set(sorted);
  const scheduledDaySet = new Set(scheduledDays);
  let best = 0;

  for (const startDate of sorted) {
    if (!scheduledDaySet.has(dayOfWeek(startDate))) continue;

    let streak = 0;
    let checkDate = startDate;

    // Walk forward through scheduled days
    for (let i = 0; i < 365; i++) {
      if (scheduledDaySet.has(dayOfWeek(checkDate))) {
        if (dateSet.has(checkDate)) {
          streak++;
        } else {
          break;
        }
      }
      checkDate = addDays(checkDate, 1);
    }

    best = Math.max(best, streak);
  }

  return best;
}

function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad);
  const db = new Date(by, bm - 1, bd);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function areConsecutiveWeeks(a: string, b: string): boolean {
  // Format: YYYY-WNN
  const [yearA, weekA] = a.split('-W').map(Number);
  const [yearB, weekB] = b.split('-W').map(Number);

  if (yearA === yearB) return weekB - weekA === 1;
  if (yearB === yearA + 1 && weekB === 1) {
    // Last week of the year varies (52 or 53)
    return weekA >= 52;
  }
  return false;
}
