import { useState, useEffect } from 'react';
import { useGoals, useGoal, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/use-api';
import { goalsApi } from '../api/goals.api';
import { useQueryClient } from '@tanstack/react-query';
import { useKeyboardStore } from '../stores/keyboard.store';
import { Panel } from '../components/shared/panel';
import { PriorityBadge } from '../components/shared/priority-badge';
import { StatusBadge } from '../components/shared/status-badge';
import { ProgressBar } from '../components/shared/progress-bar';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';

const FILTERS = ['active', 'done', 'archived', 'all'] as const;

export function GoalsPage() {
  const [filter, setFilter] = useState<string>('active');
  const filterParam = filter === 'all' ? undefined : filter;
  const { data: goals, isLoading } = useGoals({ status: filterParam });
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const qc = useQueryClient();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: detail } = useGoal(detailId ?? '');
  const { inputFocused, overlayOpen } = useKeyboardStore();

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!goals) return;

      switch (e.key) {
        case 'j': case 'ArrowDown':
          setSelectedIdx((i) => Math.min(i + 1, goals.length - 1));
          break;
        case 'k': case 'ArrowUp':
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          setSelectedIdx(0);
          break;
        case 'End':
          setSelectedIdx(goals.length - 1);
          break;
        case 'Enter':
          if (goals[selectedIdx]) setDetailId(goals[selectedIdx].id);
          break;
        case 'Backspace':
          setDetailId(null);
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'e':
          if (goals[selectedIdx]) setEditId(goals[selectedIdx].id);
          break;
        case 'x':
          if (goals[selectedIdx]) setDeleteId(goals[selectedIdx].id);
          break;
        case 'd':
          if (goals[selectedIdx]) {
            goalsApi.markDone(goals[selectedIdx].id).then(() => qc.invalidateQueries({ queryKey: ['goals'] }));
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
  }, [inputFocused, overlayOpen, goals, selectedIdx, filter, qc]);

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">Loading...</div>;

  if (detailId && detail) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button onClick={() => setDetailId(null)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]">
            &larr; Back
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-accent)]">{detail.title}</h1>
          <StatusBadge status={detail.status} />
          <PriorityBadge priority={detail.priority} />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)]">Progress: {detail.progress}%</span>
          <ProgressBar value={detail.progress} className="flex-1" />
        </div>

        <Panel title={`Milestones (${detail.milestones.length})`}>
          {detail.milestones.map((ms) => (
            <div key={ms.id} className="flex items-center gap-2 py-1">
              <button
                onClick={() => goalsApi.toggleMilestone(ms.id).then(() => qc.invalidateQueries({ queryKey: ['goals'] }))}
                className={`w-4 h-4 rounded border text-xs flex items-center justify-center ${
                  ms.done ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]' : 'border-[var(--color-border)]'
                }`}
              >
                {ms.done ? '\u2713' : null}
              </button>
              <span className={`text-sm ${ms.done ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                {ms.title}
              </span>
            </div>
          ))}
          {detail.milestones.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">No milestones</p>}
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Goals</h1>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-sm rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90">
          + New Goal
        </button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded ${filter === f ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)]'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <InlineForm
        open={showAdd}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description' },
          { name: 'targetDate', label: 'Target Date', type: 'date' },
        ]}
        onSubmit={(vals) => {
          createGoal.mutate({ title: vals.title, description: vals.description || undefined, targetDate: vals.targetDate || undefined });
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      {editId && (
        <InlineForm
          open
          initialValues={{
            title: goals?.find((g) => g.id === editId)?.title ?? '',
            description: goals?.find((g) => g.id === editId)?.description ?? '',
            targetDate: goals?.find((g) => g.id === editId)?.targetDate ?? '',
          }}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'description', label: 'Description' },
            { name: 'targetDate', label: 'Target Date', type: 'date' },
          ]}
          onSubmit={(vals) => {
            updateGoal.mutate({ id: editId, title: vals.title, description: vals.description || undefined, targetDate: vals.targetDate || undefined });
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      <div className="space-y-1">
        {goals?.map((goal, i) => (
          <button
            key={goal.id}
            onClick={() => setDetailId(goal.id)}
            data-selected={i === selectedIdx ? '' : undefined}
            className={`w-full text-left px-4 py-3 rounded transition-colors ${
              i === selectedIdx ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]' : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{goal.title}</span>
              <StatusBadge status={goal.status} />
              <PriorityBadge priority={goal.priority} />
            </div>
            <ProgressBar value={goal.progress} className="w-full max-w-48" />
          </button>
        ))}
        {goals?.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No goals matching filter</p>}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Goal"
        message="Milestones will be deleted. Tasks and habits will be unlinked."
        onConfirm={() => { if (deleteId) deleteGoal.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
