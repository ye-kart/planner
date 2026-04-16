import { describe, it, expect } from 'vitest';
import { normalizeUsername } from '@planner/core';

describe('normalizeUsername', () => {
  it('lowercases mixed-case GitHub logins', () => {
    expect(normalizeUsername('Ye-Kart')).toBe('ye-kart');
    expect(normalizeUsername('OCTOCAT')).toBe('octocat');
  });

  it('strips a leading @', () => {
    expect(normalizeUsername('@octocat')).toBe('octocat');
    expect(normalizeUsername('@Ye-Kart')).toBe('ye-kart');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUsername('  octocat  ')).toBe('octocat');
    expect(normalizeUsername('\tOctocat\n')).toBe('octocat');
  });

  it('lowercases email addresses', () => {
    expect(normalizeUsername('Alice@Example.COM')).toBe('alice@example.com');
  });

  it('only strips the first leading @, preserving @ inside emails', () => {
    expect(normalizeUsername('@alice@example.com')).toBe('alice@example.com');
  });

  it('is idempotent', () => {
    const once = normalizeUsername('  @Ye-Kart  ');
    expect(normalizeUsername(once)).toBe(once);
  });
});
