import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from './helpers';

let app: ReturnType<typeof createTestApp>['app'];
let spaceId: string;

beforeEach(() => {
  ({ app, spaceId } = createTestApp());
});

async function createTask(title: string, extra?: Record<string, unknown>) {
  const res = await app.request(`/api/spaces/${spaceId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, ...extra }),
  });
  return res.json();
}

describe('Tasks API', () => {
  it('creates and lists tasks', async () => {
    await createTask('Buy groceries');
    await createTask('Clean house');

    const res = await app.request(`/api/spaces/${spaceId}/tasks`);
    expect(res.status).toBe(200);
    const tasks = await res.json();
    expect(tasks).toHaveLength(2);
  });

  it('filters tasks by status', async () => {
    await createTask('Task 1');
    const task2 = await createTask('Task 2');

    await app.request(`/api/spaces/${spaceId}/tasks/${task2.id}/done`, { method: 'POST' });

    const todoRes = await app.request(`/api/spaces/${spaceId}/tasks?status=todo`);
    const todos = await todoRes.json();
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Task 1');

    const doneRes = await app.request(`/api/spaces/${spaceId}/tasks?status=done`);
    const dones = await doneRes.json();
    expect(dones).toHaveLength(1);
    expect(dones[0].title).toBe('Task 2');
  });

  it('marks task as done', async () => {
    const task = await createTask('Do something');

    const res = await app.request(`/api/spaces/${spaceId}/tasks/${task.id}/done`, { method: 'POST' });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('done');
    expect(updated.completedAt).toBeTruthy();
  });

  it('starts a task', async () => {
    const task = await createTask('Start me');

    const res = await app.request(`/api/spaces/${spaceId}/tasks/${task.id}/start`, { method: 'POST' });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('in_progress');
  });

  it('updates a task', async () => {
    const task = await createTask('Old title');

    const res = await app.request(`/api/spaces/${spaceId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New title', priority: 'high' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.title).toBe('New title');
    expect(updated.priority).toBe('high');
  });

  it('deletes a task', async () => {
    const task = await createTask('Delete me');

    const delRes = await app.request(`/api/spaces/${spaceId}/tasks/${task.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);

    const listRes = await app.request(`/api/spaces/${spaceId}/tasks`);
    const list = await listRes.json();
    expect(list).toHaveLength(0);
  });
});
