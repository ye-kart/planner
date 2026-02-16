import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from './helpers';

let app: ReturnType<typeof createTestApp>['app'];

beforeEach(() => {
  ({ app } = createTestApp());
});

async function createHabit(title: string, extra?: Record<string, unknown>) {
  const res = await app.request('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, ...extra }),
  });
  return res.json();
}

describe('Habits API', () => {
  it('creates and lists habits', async () => {
    await createHabit('Exercise');

    const res = await app.request('/api/habits');
    const habits = await res.json();
    expect(habits).toHaveLength(1);
    expect(habits[0].title).toBe('Exercise');
    expect(habits[0].frequency).toBe('daily');
  });

  it('checks and unchecks a habit', async () => {
    const habit = await createHabit('Meditate');

    const checkRes = await app.request(`/api/habits/${habit.id}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(checkRes.status).toBe(200);

    // Uncheck
    const uncheckRes = await app.request(`/api/habits/${habit.id}/uncheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(uncheckRes.status).toBe(200);
  });

  it('archives and restores a habit', async () => {
    const habit = await createHabit('Reading');

    const archiveRes = await app.request(`/api/habits/${habit.id}/archive`, { method: 'POST' });
    const archived = await archiveRes.json();
    expect(archived.active).toBe(false);

    const restoreRes = await app.request(`/api/habits/${habit.id}/restore`, { method: 'POST' });
    const restored = await restoreRes.json();
    expect(restored.active).toBe(true);
  });

  it('deletes a habit', async () => {
    const habit = await createHabit('Delete me');

    await app.request(`/api/habits/${habit.id}`, { method: 'DELETE' });

    const res = await app.request('/api/habits');
    const habits = await res.json();
    expect(habits).toHaveLength(0);
  });

  it('returns today habits', async () => {
    await createHabit('Daily habit');

    const res = await app.request('/api/habits/today');
    expect(res.status).toBe(200);
    const habits = await res.json();
    expect(habits).toHaveLength(1);
    expect(habits[0].done).toBe(false);
  });

  it('returns streaks', async () => {
    await createHabit('Streak habit');

    const res = await app.request('/api/habits/streaks');
    expect(res.status).toBe(200);
    const streaks = await res.json();
    expect(streaks).toHaveLength(1);
    expect(streaks[0].currentStreak).toBe(0);
  });
});
