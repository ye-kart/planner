import { api } from './client';
import type { Task } from './types';

export const tasksApi = {
  list: (filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.goalId) params.set('goalId', filters.goalId);
    const qs = params.toString();
    return api.get<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },
  show: (id: string) => api.get<Task>(`/api/tasks/${id}`),
  create: (data: { title: string; areaId?: string; goalId?: string; priority?: string; dueDate?: string; description?: string }) =>
    api.post<Task>('/api/tasks', data),
  update: (id: string, data: Partial<Task>) => api.patch<Task>(`/api/tasks/${id}`, data),
  remove: (id: string) => api.delete(`/api/tasks/${id}`),
  markDone: (id: string) => api.post<Task>(`/api/tasks/${id}/done`),
  start: (id: string) => api.post<Task>(`/api/tasks/${id}/start`),
};
