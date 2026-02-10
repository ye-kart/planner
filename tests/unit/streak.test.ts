import { describe, it, expect } from 'vitest';
import { calculateStreaks } from '../../src/services/streak.js';

describe('calculateStreaks', () => {
  describe('daily frequency', () => {
    it('returns 0 for no completions', () => {
      const result = calculateStreaks([], 'daily', null, '2026-02-10');
      expect(result).toEqual({ currentStreak: 0, bestStreak: 0 });
    });

    it('counts consecutive days from today', () => {
      const dates = ['2026-02-10', '2026-02-09', '2026-02-08'];
      const result = calculateStreaks(dates, 'daily', null, '2026-02-10');
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
    });

    it('uses grace period (yesterday counts if today not checked)', () => {
      const dates = ['2026-02-09', '2026-02-08', '2026-02-07'];
      const result = calculateStreaks(dates, 'daily', null, '2026-02-10');
      expect(result.currentStreak).toBe(3);
    });

    it('breaks streak if gap > 1 day from today', () => {
      const dates = ['2026-02-08', '2026-02-07', '2026-02-06'];
      const result = calculateStreaks(dates, 'daily', null, '2026-02-10');
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(3);
    });

    it('tracks best streak across history', () => {
      // Recent streak: 2 days, historical streak: 4 days
      const dates = ['2026-02-10', '2026-02-09', '2026-02-01', '2026-01-31', '2026-01-30', '2026-01-29'];
      const result = calculateStreaks(dates, 'daily', null, '2026-02-10');
      expect(result.currentStreak).toBe(2);
      expect(result.bestStreak).toBe(4);
    });

    it('handles single completion today', () => {
      const result = calculateStreaks(['2026-02-10'], 'daily', null, '2026-02-10');
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
    });
  });

  describe('weekly frequency', () => {
    it('returns 0 for no completions', () => {
      const result = calculateStreaks([], 'weekly', null, '2026-02-10');
      expect(result).toEqual({ currentStreak: 0, bestStreak: 0 });
    });

    it('counts consecutive weeks with completions', () => {
      // Feb 10 is week 7, Feb 3 is week 6, Jan 27 is week 5
      const dates = ['2026-02-10', '2026-02-03', '2026-01-27'];
      const result = calculateStreaks(dates, 'weekly', null, '2026-02-10');
      expect(result.currentStreak).toBe(3);
    });

    it('breaks on missing week', () => {
      // Feb 10 is week 7, Jan 27 is week 5 (missing week 6)
      const dates = ['2026-02-10', '2026-01-27'];
      const result = calculateStreaks(dates, 'weekly', null, '2026-02-10');
      expect(result.currentStreak).toBe(1);
    });
  });

  describe('specific_days frequency', () => {
    it('returns 0 for no completions', () => {
      const result = calculateStreaks([], 'specific_days', [1, 3, 5], '2026-02-10');
      expect(result).toEqual({ currentStreak: 0, bestStreak: 0 });
    });

    it('counts consecutive scheduled days with completions', () => {
      // Feb 10 is Tue (2), not a scheduled day
      // Scheduled: Mon(1), Wed(3), Fri(5)
      // Feb 6=Fri, Feb 4=Wed, Feb 2=Mon (the actual scheduled days in Feb 2026)
      const dates = ['2026-02-06', '2026-02-04', '2026-02-02'];
      const result = calculateStreaks(dates, 'specific_days', [1, 3, 5], '2026-02-10');
      // Grace: Feb 9 (Mon) is the most recent scheduled day, no completion yet
      // Then Feb 6(Fri)=done, Feb 4(Wed)=done, Feb 2(Mon)=done → streak=3
      expect(result.currentStreak).toBe(3);
    });

    it('returns 0 for empty days array', () => {
      const result = calculateStreaks(['2026-02-10'], 'specific_days', [], '2026-02-10');
      expect(result).toEqual({ currentStreak: 0, bestStreak: 0 });
    });
  });
});
