import { api } from './client';
import type { Space } from './types';

export const spacesApi = {
  list: () => api.get<Space[]>('/api/spaces'),
  show: (id: string) => api.get<Space>(`/api/spaces/${id}`),
  create: (data: { name: string; description?: string; icon?: string }) => api.post<Space>('/api/spaces', data),
  update: (id: string, data: { name?: string; description?: string; icon?: string }) => api.patch<Space>(`/api/spaces/${id}`, data),
  remove: (id: string) => api.delete(`/api/spaces/${id}`),
};
