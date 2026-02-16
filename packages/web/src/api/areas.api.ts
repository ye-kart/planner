import { api } from './client';
import type { AreaWithStats, AreaDetail, Area } from './types';

export const areasApi = {
  list: () => api.get<AreaWithStats[]>('/api/areas'),
  show: (id: string) => api.get<AreaDetail>(`/api/areas/${id}`),
  create: (data: { name: string; description?: string }) => api.post<Area>('/api/areas', data),
  update: (id: string, data: { name?: string; description?: string }) => api.patch<Area>(`/api/areas/${id}`, data),
  remove: (id: string) => api.delete(`/api/areas/${id}`),
};
