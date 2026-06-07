import { useState, useEffect } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/use-api';
import { tasksApi } from '../api/tasks.api';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentSpace } from '../contexts/space-context';
import { useKeyboardStore } from '../stores/keyboard.store';
import { PriorityBadge } from '../components/shared/priority-badge';
import { StatusBadge } from '../components/shared/status-badge';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';

const FILTERS = ['all', 'todo', 'in_progress', 'done'] as const;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/** Local calendar date as YYYY-MM-DD (matches how due dates are entered). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function TasksPage() {
  const { spaceId } = useCurrentSpace();
  const [filter, setFilter] = useState<string>('all');
  const filterParam = filter === 'all' ? undefined : filter;
  const { data: tasks, isLoading } = useTasks({ status: filterParam });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const qc = useQueryClient();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { inputFocused, overlayOpen } = useKeyboardStore();

  const refreshTasks = () => {
    qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'tasks'] });
    qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'status'] });
  };

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

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
        case 'Home':
          setSelectedIdx(0);
          break;
        case 'End':
          setSelectedIdx(tasks.length - 1);
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'e':
          if (tasks[selectedIdx]) setEditId(tasks[selectedIdx].id);
          break;
        case 'x':
          if (tasks[selectedIdx]) setDeleteId(tasks[selectedIdx].id);
          break;
        case 'd':
          if (tasks[selectedIdx]) {
            tasksApi.markDone(spaceId, tasks[selectedIdx].id).then(refreshTasks);
          }
          break;
        case 's':
          if (tasks[selectedIdx]) {
            tasksApi.start(spaceId, tasks[selectedIdx].id).then(refreshTasks);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputFocused, overlayOpen, tasks, selectedIdx, filter, qc, spaceId]);

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">Loading...</div>;

  const today = localToday();

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Tasks</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90 active:opacity-80 transition-opacity">
          + New Task
        </button>
      </div>

      <div className="flex gap-1.5 bg-[var(--color-bg-panel)] rounded-lg p-1 border border-[var(--color-border)]">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${filter === f ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)]'}`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <InlineForm
        open={showAdd}
        initialValues={{ priority: 'medium' }}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
          { name: 'dueDate', label: 'Due Date', type: 'date' },
        ]}
        onSubmit={(vals) => {
          createTask.mutate({ title: vals.title, description: vals.description || undefined, priority: vals.priority || undefined, dueDate: vals.dueDate || undefined });
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      {editId && (
        <InlineForm
          open
          initialValues={{
            title: tasks?.find((t) => t.id === editId)?.title ?? '',
            description: tasks?.find((t) => t.id === editId)?.description ?? '',
            priority: tasks?.find((t) => t.id === editId)?.priority ?? 'medium',
            dueDate: tasks?.find((t) => t.id === editId)?.dueDate ?? '',
          }}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
            { name: 'dueDate', label: 'Due Date', type: 'date' },
          ]}
          onSubmit={(vals) => {
            updateTask.mutate({ id: editId, title: vals.title, description: vals.description || undefined, priority: vals.priority || undefined, dueDate: vals.dueDate || undefined });
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      <div className="space-y-2">
        {tasks?.map((task, i) => {
          const overdue = task.dueDate && task.dueDate < today && task.status !== 'done';
          return (
            <div
              key={task.id}
              data-selected={i === selectedIdx ? '' : undefined}
              className={`px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                i === selectedIdx ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]' : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
              }`}
              onClick={() => setSelectedIdx(i)}
            >
              <div className="flex items-start gap-3">
                <button
                  aria-label={task.status === 'done' ? 'Task done' : 'Mark task done'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task.status !== 'done') {
                      tasksApi.markDone(spaceId, task.id).then(refreshTasks);
                    }
                  }}
                  className={`w-6 h-6 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                    task.status === 'done'
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-active)]'
                  }`}
                >
                  {task.status === 'done' ? '✓' : null}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && (
                      <span className={`text-xs ${overdue ? 'text-[var(--color-error)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                        {overdue ? 'Overdue: ' : 'Due: '}{task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditId(task.id); }}
                    className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:border-[var(--color-border-active)] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }}
                    className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {tasks?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">{ filter === 'done' ? '🎯' : '📋' }</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {filter === 'all' ? 'No tasks yet — press n to create one' : `No ${filter.replace('_', ' ')} tasks`}
            </p>
          </div>
        )}
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
