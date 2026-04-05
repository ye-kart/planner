import { api } from './client';
import type { StatusData } from './types';

export const statusApi = {
  get: (spaceId: string) => api.get<StatusData>(`/api/spaces/${spaceId}/status`),
};
