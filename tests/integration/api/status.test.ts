import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from './helpers';

let app: ReturnType<typeof createTestApp>['app'];
let spaceId: string;

beforeEach(() => {
  ({ app, spaceId } = createTestApp());
});

describe('Status API', () => {
  it('GET /api/status returns dashboard data', async () => {
    const res = await app.request(`/api/spaces/${spaceId}/status`);
    expect(res.status).toBe(200);
    const status = await res.json();

    expect(status).toHaveProperty('date');
    expect(status).toHaveProperty('dateFormatted');
    expect(status).toHaveProperty('tasksDueToday');
    expect(status).toHaveProperty('tasksOverdue');
    expect(status).toHaveProperty('habitsDueToday');
    expect(status).toHaveProperty('summary');
    expect(status.summary).toHaveProperty('tasksDue');
    expect(status.summary).toHaveProperty('tasksOverdue');
    expect(status.summary).toHaveProperty('habitsDue');
    expect(status.summary).toHaveProperty('habitsDone');
  });

  it('reflects created habits in status', async () => {
    // Create a daily habit
    await app.request(`/api/spaces/${spaceId}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Daily exercise' }),
    });

    const res = await app.request(`/api/spaces/${spaceId}/status`);
    const status = await res.json();
    expect(status.summary.habitsDue).toBe(1);
    expect(status.summary.habitsDone).toBe(0);
  });
});
