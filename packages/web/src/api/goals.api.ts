import { api } from './client';
import type { Goal, GoalDetail, Milestone } from './types';

export const goalsApi = {
  list: (filters?: { areaId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return api.get<Goal[]>(`/api/goals${qs ? `?${qs}` : ''}`);
  },
  show: (id: string) => api.get<GoalDetail>(`/api/goals/${id}`),
  create: (data: { title: string; areaId?: string; targetDate?: string; priority?: string; description?: string }) =>
    api.post<Goal>('/api/goals', data),
  update: (id: string, data: Partial<Goal>) => api.patch<Goal>(`/api/goals/${id}`, data),
  remove: (id: string) => api.delete(`/api/goals/${id}`),
  setProgress: (id: string, progress: number) => api.post<Goal>(`/api/goals/${id}/progress`, { progress }),
  markDone: (id: string) => api.post<Goal>(`/api/goals/${id}/done`),
  archive: (id: string) => api.post<Goal>(`/api/goals/${id}/archive`),
  addMilestone: (goalId: string, title: string) => api.post<Milestone>(`/api/goals/${goalId}/milestones`, { title }),
  toggleMilestone: (msId: string) => api.post<Milestone>(`/api/goals/milestones/${msId}/toggle`),
  removeMilestone: (msId: string) => api.delete(`/api/goals/milestones/${msId}`),
};
