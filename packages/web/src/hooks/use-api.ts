import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spacesApi } from '../api/spaces.api';
import { areasApi } from '../api/areas.api';
import { goalsApi } from '../api/goals.api';
import { tasksApi } from '../api/tasks.api';
import { habitsApi } from '../api/habits.api';
import { statusApi } from '../api/status.api';
import { authApi } from '../api/auth.api';
import { mcpApi } from '../api/mcp.api';
import { useCurrentSpace } from '../contexts/space-context';
import type { McpTokenScope } from '../api/types';

// --- Auth / trial ---
export function useAuthMe() {
  return useQuery({ queryKey: ['auth', 'me'], queryFn: authApi.me, staleTime: 60_000 });
}

export function useTrial() {
  return useQuery({ queryKey: ['auth', 'trial'], queryFn: authApi.trial, staleTime: 60_000 });
}

// --- Spaces (unscoped) ---
export function useSpaces() {
  return useQuery({ queryKey: ['spaces'], queryFn: spacesApi.list });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: spacesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces'] }),
  });
}

export function useUpdateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; icon?: string }) =>
      spacesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces'] }),
  });
}

export function useDeleteSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: spacesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces'] }),
  });
}

// --- Areas ---
export function useAreas() {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'areas'], queryFn: () => areasApi.list(spaceId) });
}

export function useArea(id: string) {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'areas', id], queryFn: () => areasApi.show(spaceId, id), enabled: !!id });
}

export function useCreateArea() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => areasApi.create(spaceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'areas'] }),
  });
}

export function useUpdateArea() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      areasApi.update(spaceId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'areas'] }),
  });
}

export function useDeleteArea() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => areasApi.remove(spaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'areas'] }),
  });
}

// --- Goals ---
export function useGoals(filters?: { areaId?: string; status?: string }) {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'goals', filters], queryFn: () => goalsApi.list(spaceId, filters) });
}

export function useGoal(id: string) {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'goals', id], queryFn: () => goalsApi.show(spaceId, id), enabled: !!id });
}

export function useCreateGoal() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; areaId?: string; targetDate?: string; priority?: string; description?: string }) =>
      goalsApi.create(spaceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'goals'] }),
  });
}

export function useUpdateGoal() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      goalsApi.update(spaceId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'goals'] }),
  });
}

export function useDeleteGoal() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(spaceId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'goals'] }),
  });
}

// --- Tasks ---
export function useTasks(filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }) {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'tasks', filters], queryFn: () => tasksApi.list(spaceId, filters) });
}

export function useCreateTask() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; areaId?: string; goalId?: string; priority?: string; dueDate?: string; description?: string }) =>
      tasksApi.create(spaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'tasks'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

export function useUpdateTask() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      tasksApi.update(spaceId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'tasks'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

export function useDeleteTask() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.remove(spaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'tasks'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

// --- Habits ---
export function useHabits(filters?: { areaId?: string; goalId?: string }) {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'habits', filters], queryFn: () => habitsApi.list(spaceId, filters) });
}

export function useHabitsToday() {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'habits', 'today'], queryFn: () => habitsApi.today(spaceId) });
}

export function useCreateHabit() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; frequency?: string; days?: number[]; areaId?: string; goalId?: string }) =>
      habitsApi.create(spaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'habits'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

export function useUpdateHabit() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      habitsApi.update(spaceId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'habits'] }),
  });
}

export function useDeleteHabit() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsApi.remove(spaceId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'habits'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

export function useCheckHabit() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => habitsApi.check(spaceId, id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'habits'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

export function useUncheckHabit() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => habitsApi.uncheck(spaceId, id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'habits'] });
      qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
    },
  });
}

// --- Status ---
export function useStatus() {
  const { spaceId } = useCurrentSpace();
  return useQuery({ queryKey: ['spaces', spaceId, 'status'], queryFn: () => statusApi.get(spaceId) });
}

// --- MCP agent access ---
export function useMcpTokens() {
  const { spaceId } = useCurrentSpace();
  return useQuery({
    queryKey: ['spaces', spaceId, 'mcp-tokens'],
    queryFn: () => mcpApi.listTokens(spaceId),
  });
}

export function useCreateMcpToken() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      scopes: McpTokenScope[];
      expiresInDays: number;
    }) => mcpApi.createToken({ ...data, spaceId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'mcp-tokens'] }),
  });
}

export function useRevokeMcpToken() {
  const { spaceId } = useCurrentSpace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mcpApi.revokeToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'mcp-tokens'] }),
  });
}
