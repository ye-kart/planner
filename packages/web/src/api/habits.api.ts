import { api } from './client';
import type { Habit, HabitWithDone } from './types';

export const habitsApi = {
  list: (spaceId: string, filters?: { areaId?: string; goalId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.goalId) params.set('goalId', filters.goalId);
    const qs = params.toString();
    return api.get<Habit[]>(`/api/spaces/${spaceId}/habits${qs ? `?${qs}` : ''}`);
  },
  today: (spaceId: string) => api.get<HabitWithDone[]>(`/api/spaces/${spaceId}/habits/today`),
  show: (spaceId: string, id: string) => api.get<Habit>(`/api/spaces/${spaceId}/habits/${id}`),
  create: (spaceId: string, data: { title: string; frequency?: string; days?: number[]; areaId?: string; goalId?: string }) =>
    api.post<Habit>(`/api/spaces/${spaceId}/habits`, data),
  update: (spaceId: string, id: string, data: Partial<Habit>) => api.patch<Habit>(`/api/spaces/${spaceId}/habits/${id}`, data),
  remove: (spaceId: string, id: string) => api.delete(`/api/spaces/${spaceId}/habits/${id}`),
  check: (spaceId: string, id: string, date?: string) => api.post(`/api/spaces/${spaceId}/habits/${id}/check`, { date }),
  uncheck: (spaceId: string, id: string, date?: string) => api.post(`/api/spaces/${spaceId}/habits/${id}/uncheck`, { date }),
  archive: (spaceId: string, id: string) => api.post<Habit>(`/api/spaces/${spaceId}/habits/${id}/archive`),
  restore: (spaceId: string, id: string) => api.post<Habit>(`/api/spaces/${spaceId}/habits/${id}/restore`),
};
