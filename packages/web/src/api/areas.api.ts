import { api } from './client';
import type { AreaWithStats, AreaDetail, Area } from './types';

export const areasApi = {
  list: (spaceId: string) => api.get<AreaWithStats[]>(`/api/spaces/${spaceId}/areas`),
  show: (spaceId: string, id: string) => api.get<AreaDetail>(`/api/spaces/${spaceId}/areas/${id}`),
  create: (spaceId: string, data: { name: string; description?: string }) => api.post<Area>(`/api/spaces/${spaceId}/areas`, data),
  update: (spaceId: string, id: string, data: { name?: string; description?: string }) => api.patch<Area>(`/api/spaces/${spaceId}/areas/${id}`, data),
  remove: (spaceId: string, id: string) => api.delete(`/api/spaces/${spaceId}/areas/${id}`),
};
