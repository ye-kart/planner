import { api } from './client';
import type { Task } from './types';

export const tasksApi = {
  list: (spaceId: string, filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.goalId) params.set('goalId', filters.goalId);
    const qs = params.toString();
    return api.get<Task[]>(`/api/spaces/${spaceId}/tasks${qs ? `?${qs}` : ''}`);
  },
  show: (spaceId: string, id: string) => api.get<Task>(`/api/spaces/${spaceId}/tasks/${id}`),
  create: (spaceId: string, data: { title: string; areaId?: string; goalId?: string; priority?: string; dueDate?: string; description?: string }) =>
    api.post<Task>(`/api/spaces/${spaceId}/tasks`, data),
  update: (spaceId: string, id: string, data: Partial<Task>) => api.patch<Task>(`/api/spaces/${spaceId}/tasks/${id}`, data),
  remove: (spaceId: string, id: string) => api.delete(`/api/spaces/${spaceId}/tasks/${id}`),
  markDone: (spaceId: string, id: string) => api.post<Task>(`/api/spaces/${spaceId}/tasks/${id}/done`),
  start: (spaceId: string, id: string) => api.post<Task>(`/api/spaces/${spaceId}/tasks/${id}/start`),
};
