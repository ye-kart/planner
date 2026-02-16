import { useState, useEffect } from 'react';
import { useTasks, useCreateTask, useDeleteTask } from '../hooks/use-api';
import { tasksApi } from '../api/tasks.api';
import { useQueryClient } from '@tanstack/react-query';
import { useKeyboardStore } from '../stores/keyboard.store';
import { PriorityBadge } from '../components/shared/priority-badge';
import { StatusBadge } from '../components/shared/status-badge';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';

const FILTERS = ['all', 'todo', 'in_progress', 'done'] as const;

export function TasksPage() {
  const [filter, setFilter] = useState<string>('all');
  const filterParam = filter === 'all' ? undefined : filter;
  const { data: tasks, isLoading } = useTasks({ status: filterParam });
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const qc = useQueryClient();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { inputFocused, overlayOpen } = useKeyboardStore();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!tasks) return;

      switch (e.key) {
        case 'j': case 'ArrowDown':
          setSelectedIdx((i) => Math.min(i + 1, tasks.length - 1));
          break;
        case 'k': case 'ArrowUp':
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'x':
          if (tasks[selectedIdx]) setDeleteId(tasks[selectedIdx].id);
          break;
        case 'd':
          if (tasks[selectedIdx]) {
            tasksApi.markDone(tasks[selectedIdx].id).then(() => {
              qc.invalidateQueries({ queryKey: ['tasks'] });
              qc.invalidateQueries({ queryKey: ['status'] });
            });
          }
          break;
        case 's':
          if (tasks[selectedIdx]) {
            tasksApi.start(tasks[selectedIdx].id).then(() => qc.invalidateQueries({ queryKey: ['tasks'] }));
          }
          break;
        case 'f': case 'F': {
          const idx = FILTERS.indexOf(filter as typeof FILTERS[number]);
          setFilter(FILTERS[(idx + (e.shiftKey ? FILTERS.length - 1 : 1)) % FILTERS.length]);
          break;
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inputFocused, overlayOpen, tasks, selectedIdx, filter, qc]);

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">Loading...</div>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Tasks</h1>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-sm rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90">
          + New Task
        </button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded ${filter === f ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)]'}`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <InlineForm
        open={showAdd}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description' },
          { name: 'dueDate', label: 'Due Date', type: 'date' },
        ]}
        onSubmit={(vals) => {
          createTask.mutate({ title: vals.title, description: vals.description || undefined, dueDate: vals.dueDate || undefined });
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      <div className="space-y-1">
        {tasks?.map((task, i) => {
          const overdue = task.dueDate && task.dueDate < today && task.status !== 'done';
          return (
            <div
              key={task.id}
              className={`px-4 py-3 rounded flex items-center justify-between transition-colors cursor-pointer ${
                i === selectedIdx ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]' : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
              }`}
              onClick={() => setSelectedIdx(i)}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.status !== 'done') {
                      tasksApi.markDone(task.id).then(() => {
                        qc.invalidateQueries({ queryKey: ['tasks'] });
                        qc.invalidateQueries({ queryKey: ['status'] });
                      });
                    }
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                    task.status === 'done'
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-active)]'
                  }`}
                >
                  {task.status === 'done' ? '\u2713' : null}
                </button>
                <span className={`text-sm ${task.status === 'done' ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {task.title}
                </span>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="text-xs">
                {task.dueDate && (
                  <span className={overdue ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}>
                    {overdue ? 'Overdue: ' : ''}{task.dueDate}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {tasks?.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No tasks matching filter</p>}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Task"
        message="This will permanently delete the task."
        onConfirm={() => { if (deleteId) deleteTask.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
