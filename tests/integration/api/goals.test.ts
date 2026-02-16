import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from './helpers';

let app: ReturnType<typeof createTestApp>['app'];

beforeEach(() => {
  ({ app } = createTestApp());
});

async function createGoal(title: string, extra?: Record<string, unknown>) {
  const res = await app.request('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, ...extra }),
  });
  return res.json();
}

describe('Goals API', () => {
  it('creates and lists goals', async () => {
    await createGoal('Learn TypeScript');

    const res = await app.request('/api/goals');
    const goals = await res.json();
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe('Learn TypeScript');
  });

  it('shows goal detail with milestones', async () => {
    const goal = await createGoal('Build app');

    // Add milestone
    await app.request(`/api/goals/${goal.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Setup project' }),
    });

    const res = await app.request(`/api/goals/${goal.id}`);
    const detail = await res.json();
    expect(detail.milestones).toHaveLength(1);
    expect(detail.milestones[0].title).toBe('Setup project');
  });

  it('toggles milestone and recalculates progress', async () => {
    const goal = await createGoal('Two step goal');

    const ms1Res = await app.request(`/api/goals/${goal.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Step 1' }),
    });
    const ms1 = await ms1Res.json();

    await app.request(`/api/goals/${goal.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Step 2' }),
    });

    // Toggle step 1 done
    const toggleRes = await app.request(`/api/goals/milestones/${ms1.id}/toggle`, { method: 'POST' });
    const toggled = await toggleRes.json();
    expect(toggled.done).toBe(true);

    // Check progress updated
    const goalRes = await app.request(`/api/goals/${goal.id}`);
    const updated = await goalRes.json();
    expect(updated.progress).toBe(50);
  });

  it('marks goal done', async () => {
    const goal = await createGoal('Finish it');

    const res = await app.request(`/api/goals/${goal.id}/done`, { method: 'POST' });
    const updated = await res.json();
    expect(updated.status).toBe('done');
    expect(updated.progress).toBe(100);
  });

  it('archives goal', async () => {
    const goal = await createGoal('Archive me');

    const res = await app.request(`/api/goals/${goal.id}/archive`, { method: 'POST' });
    const updated = await res.json();
    expect(updated.status).toBe('archived');
  });

  it('filters goals by status', async () => {
    await createGoal('Active goal');
    const archiveGoal = await createGoal('To archive');
    await app.request(`/api/goals/${archiveGoal.id}/archive`, { method: 'POST' });

    const activeRes = await app.request('/api/goals?status=active');
    const active = await activeRes.json();
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe('Active goal');
  });
});
