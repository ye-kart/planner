import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp } from './helpers';

let app: ReturnType<typeof createTestApp>['app'];
let spaceId: string;

beforeEach(() => {
  ({ app, spaceId } = createTestApp());
});

describe('Areas API', () => {
  it('GET /api/areas returns empty list initially', async () => {
    const res = await app.request(`/api/spaces/${spaceId}/areas`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('POST /api/areas creates an area', async () => {
    const res = await app.request(`/api/spaces/${spaceId}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Health', description: 'Physical wellness' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Health');
    expect(body.description).toBe('Physical wellness');
    expect(body.id).toHaveLength(8);
  });

  it('GET /api/areas/:id shows area detail', async () => {
    const createRes = await app.request(`/api/spaces/${spaceId}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Health' }),
    });
    const area = await createRes.json();

    const res = await app.request(`/api/spaces/${spaceId}/areas/${area.id}`);
    expect(res.status).toBe(200);
    const detail = await res.json();
    expect(detail.name).toBe('Health');
    expect(detail.goals).toEqual([]);
    expect(detail.tasks).toEqual([]);
    expect(detail.habits).toEqual([]);
  });

  it('PATCH /api/areas/:id updates an area', async () => {
    const createRes = await app.request(`/api/spaces/${spaceId}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Helth' }),
    });
    const area = await createRes.json();

    const res = await app.request(`/api/spaces/${spaceId}/areas/${area.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Health' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.name).toBe('Health');
  });

  it('DELETE /api/areas/:id removes an area', async () => {
    const createRes = await app.request(`/api/spaces/${spaceId}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Health' }),
    });
    const area = await createRes.json();

    const delRes = await app.request(`/api/spaces/${spaceId}/areas/${area.id}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);

    const listRes = await app.request(`/api/spaces/${spaceId}/areas`);
    const list = await listRes.json();
    expect(list).toEqual([]);
  });

  it('returns 404 for missing area', async () => {
    const res = await app.request(`/api/spaces/${spaceId}/areas/nonexist`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid name', async () => {
    const res = await app.request(`/api/spaces/${spaceId}/areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });
});
