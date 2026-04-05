import { api } from './client';
import type { Goal, GoalDetail, Milestone } from './types';

export const goalsApi = {
  list: (spaceId: string, filters?: { areaId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.areaId) params.set('areaId', filters.areaId);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return api.get<Goal[]>(`/api/spaces/${spaceId}/goals${qs ? `?${qs}` : ''}`);
  },
  show: (spaceId: string, id: string) => api.get<GoalDetail>(`/api/spaces/${spaceId}/goals/${id}`),
  create: (spaceId: string, data: { title: string; areaId?: string; targetDate?: string; priority?: string; description?: string }) =>
    api.post<Goal>(`/api/spaces/${spaceId}/goals`, data),
  update: (spaceId: string, id: string, data: Partial<Goal>) => api.patch<Goal>(`/api/spaces/${spaceId}/goals/${id}`, data),
  remove: (spaceId: string, id: string) => api.delete(`/api/spaces/${spaceId}/goals/${id}`),
  setProgress: (spaceId: string, id: string, progress: number) => api.post<Goal>(`/api/spaces/${spaceId}/goals/${id}/progress`, { progress }),
  markDone: (spaceId: string, id: string) => api.post<Goal>(`/api/spaces/${spaceId}/goals/${id}/done`),
  archive: (spaceId: string, id: string) => api.post<Goal>(`/api/spaces/${spaceId}/goals/${id}/archive`),
  addMilestone: (spaceId: string, goalId: string, title: string) => api.post<Milestone>(`/api/spaces/${spaceId}/goals/${goalId}/milestones`, { title }),
  toggleMilestone: (spaceId: string, msId: string) => api.post<Milestone>(`/api/spaces/${spaceId}/goals/milestones/${msId}/toggle`),
  removeMilestone: (spaceId: string, msId: string) => api.delete(`/api/spaces/${spaceId}/goals/milestones/${msId}`),
};
