import { api } from './client';

export interface AllowedUser {
  id: string;
  provider: 'github' | 'google';
  username: string;
  isAdmin: boolean;
  createdAt: string;
}

export function fetchAllowedUsers(): Promise<AllowedUser[]> {
  return api.get('/api/admin/allowed-users');
}

export function addAllowedUser(provider: string, username: string): Promise<AllowedUser> {
  return api.post('/api/admin/allowed-users', { provider, username });
}

export function removeAllowedUser(id: string): Promise<{ ok: boolean }> {
  return api.delete(`/api/admin/allowed-users/${id}`);
}
