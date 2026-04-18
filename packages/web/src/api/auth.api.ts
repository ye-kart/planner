import { api } from './client';
import type { AuthMe, TrialStatus } from './types';

export const authApi = {
  me: () => api.get<AuthMe>('/api/auth/me'),
  trial: () => api.get<TrialStatus>('/api/auth/trial'),
};
