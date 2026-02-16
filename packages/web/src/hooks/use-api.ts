import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { areasApi } from '../api/areas.api';
import { goalsApi } from '../api/goals.api';
import { tasksApi } from '../api/tasks.api';
import { habitsApi } from '../api/habits.api';
import { statusApi } from '../api/status.api';

// --- Areas ---
export function useAreas() {
  return useQuery({ queryKey: ['areas'], queryFn: areasApi.list });
}

export function useArea(id: string) {
  return useQuery({ queryKey: ['areas', id], queryFn: () => areasApi.show(id), enabled: !!id });
}

export function useCreateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: areasApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      areasApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
  });
}

export function useDeleteArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: areasApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas'] }),
  });
}

// --- Goals ---
export function useGoals(filters?: { areaId?: string; status?: string }) {
  return useQuery({ queryKey: ['goals', filters], queryFn: () => goalsApi.list(filters) });
}

export function useGoal(id: string) {
  return useQuery({ queryKey: ['goals', id], queryFn: () => goalsApi.show(id), enabled: !!id });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      goalsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

// --- Tasks ---
export function useTasks(filters?: { status?: string; priority?: string; areaId?: string; goalId?: string }) {
  return useQuery({ queryKey: ['tasks', filters], queryFn: () => tasksApi.list(filters) });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tasksApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

// --- Habits ---
export function useHabits(filters?: { areaId?: string; goalId?: string }) {
  return useQuery({ queryKey: ['habits', filters], queryFn: () => habitsApi.list(filters) });
}

export function useHabitsToday() {
  return useQuery({ queryKey: ['habits', 'today'], queryFn: habitsApi.today });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: habitsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      habitsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: habitsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useCheckHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => habitsApi.check(id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useUncheckHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) => habitsApi.uncheck(id, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

// --- Status ---
export function useStatus() {
  return useQuery({ queryKey: ['status'], queryFn: statusApi.get });
}
