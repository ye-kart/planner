import { describe, it, expect } from 'vitest';
import { toISODate, parseDate, dayOfWeek, isoWeek, addDays, diffDays, formatDateHuman } from '../../src/utils/date.js';

describe('date utilities', () => {
  it('toISODate formats correctly', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODate(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('parseDate parses YYYY-MM-DD', () => {
    const d = parseDate('2026-02-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1); // 0-indexed
    expect(d.getDate()).toBe(10);
  });

  it('dayOfWeek returns 0-6', () => {
    // Feb 10, 2026 is a Tuesday
    expect(dayOfWeek('2026-02-10')).toBe(2);
    // Feb 8, 2026 is a Sunday
    expect(dayOfWeek('2026-02-08')).toBe(0);
  });

  it('isoWeek returns correct week number', () => {
    const week = isoWeek('2026-02-10');
    expect(week).toMatch(/2026-W\d{2}/);
  });

  it('addDays adds correctly', () => {
    expect(addDays('2026-02-10', 1)).toBe('2026-02-11');
    expect(addDays('2026-02-10', -1)).toBe('2026-02-09');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('diffDays calculates difference', () => {
    expect(diffDays('2026-02-12', '2026-02-10')).toBe(2);
    expect(diffDays('2026-02-10', '2026-02-12')).toBe(-2);
  });

  it('formatDateHuman produces readable format', () => {
    const result = formatDateHuman('2026-02-10');
    expect(result).toContain('Feb');
    expect(result).toContain('10');
    expect(result).toContain('2026');
  });
});
