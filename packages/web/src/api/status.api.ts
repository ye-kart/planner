import { api } from './client';
import type { StatusData } from './types';

export const statusApi = {
  get: () => api.get<StatusData>('/api/status'),
};
