import { api } from './client';
import type { Habit, HabitWithDone } from './types';

export const habitsApi = {
  list: (filters?: { areaId?: string; goalId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.goalId) params.set('goalId', filters.goalId);
    const qs = params.toString();
    return api.get<Habit[]>(`/api/habits${qs ? `?${qs}` : ''}`);
  },
  today: () => api.get<HabitWithDone[]>('/api/habits/today'),
  show: (id: string) => api.get<Habit>(`/api/habits/${id}`),
  create: (data: { title: string; frequency?: string; days?: number[]; areaId?: string; goalId?: string }) =>
    api.post<Habit>('/api/habits', data),
  update: (id: string, data: Partial<Habit>) => api.patch<Habit>(`/api/habits/${id}`, data),
  remove: (id: string) => api.delete(`/api/habits/${id}`),
  check: (id: string, date?: string) => api.post(`/api/habits/${id}/check`, { date }),
  uncheck: (id: string, date?: string) => api.post(`/api/habits/${id}/uncheck`, { date }),
  archive: (id: string) => api.post<Habit>(`/api/habits/${id}/archive`),
  restore: (id: string) => api.post<Habit>(`/api/habits/${id}/restore`),
};
