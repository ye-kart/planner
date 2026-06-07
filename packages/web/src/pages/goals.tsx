import { useState, useEffect } from 'react';
import { useGoals, useGoal, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks/use-api';
import { goalsApi } from '../api/goals.api';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentSpace } from '../contexts/space-context';
import { useKeyboardStore } from '../stores/keyboard.store';
import { Panel } from '../components/shared/panel';
import { PriorityBadge } from '../components/shared/priority-badge';
import { StatusBadge } from '../components/shared/status-badge';
import { ProgressBar } from '../components/shared/progress-bar';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';

const FILTERS = ['active', 'done', 'archived', 'all'] as const;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function GoalsPage() {
  const { spaceId } = useCurrentSpace();
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

  const refreshGoals = () => qc.invalidateQueries({ queryKey: ['spaces', spaceId, 'goals'] });

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!goals) return;

      // In the detail view, route mutating shortcuts at the open goal, not the
      // (possibly different) list selection.
      if (detailId) {
        switch (e.key) {
          case 'Backspace':
            setDetailId(null);
            break;
          case 'd':
            goalsApi.markDone(spaceId, detailId).then(refreshGoals);
            break;
          case 'x':
            setDeleteId(detailId);
            break;
        }
        return;
      }

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
            goalsApi.markDone(spaceId, goals[selectedIdx].id).then(refreshGoals);
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
  }, [inputFocused, overlayOpen, goals, selectedIdx, filter, qc, spaceId, detailId]);

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
          <div className="flex items-center gap-1 ml-auto">
            {detail.status !== 'done' && (
              <button
                onClick={() => goalsApi.markDone(spaceId, detail.id).then(refreshGoals)}
                className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-success)] hover:border-[var(--color-success)] transition-colors"
              >
                Mark done
              </button>
            )}
            <button
              onClick={() => setEditId(detail.id)}
              className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:border-[var(--color-border-active)] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteId(detail.id)}
              className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)]">Progress: {detail.progress}%</span>
          <ProgressBar value={detail.progress} className="flex-1" />
        </div>

        <Panel title={`Milestones (${detail.milestones.length})`}>
          {detail.milestones.map((ms) => (
            <div key={ms.id} className="flex items-center gap-2 py-1">
              <button
                onClick={() => goalsApi.toggleMilestone(spaceId, ms.id).then(refreshGoals)}
                className={`w-4 h-4 rounded border text-xs flex items-center justify-center ${
                  ms.done ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]' : 'border-[var(--color-border)]'
                }`}
              >
                {ms.done ? '✓' : null}
              </button>
              <span className={`text-sm ${ms.done ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                {ms.title}
              </span>
            </div>
          ))}
          {detail.milestones.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">No milestones</p>}
        </Panel>

        {editId && (
          <InlineForm
            open
            initialValues={{
              title: detail.title,
              description: detail.description ?? '',
              priority: detail.priority,
              targetDate: detail.targetDate ?? '',
            }}
            fields={[
              { name: 'title', label: 'Title', required: true },
              { name: 'description', label: 'Description', type: 'textarea' },
              { name: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
              { name: 'targetDate', label: 'Target Date', type: 'date' },
            ]}
            onSubmit={(vals) => {
              updateGoal.mutate({ id: detail.id, title: vals.title, description: vals.description || undefined, priority: vals.priority || undefined, targetDate: vals.targetDate || undefined });
              setEditId(null);
            }}
            onCancel={() => setEditId(null)}
          />
        )}

        <ConfirmDialog
          open={!!deleteId}
          title="Delete Goal"
          message="Milestones will be deleted. Tasks and habits will be unlinked."
          onConfirm={() => { if (deleteId) { deleteGoal.mutate(deleteId); setDetailId(null); } setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Goals</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90 active:opacity-80 transition-opacity">
          + New Goal
        </button>
      </div>

      <div className="flex gap-1.5 bg-[var(--color-bg-panel)] rounded-lg p-1 border border-[var(--color-border)]">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${filter === f ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)]'}`}
          >
            {f}
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
          { name: 'targetDate', label: 'Target Date', type: 'date' },
        ]}
        onSubmit={(vals) => {
          createGoal.mutate({ title: vals.title, description: vals.description || undefined, priority: vals.priority || undefined, targetDate: vals.targetDate || undefined });
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
            priority: goals?.find((g) => g.id === editId)?.priority ?? 'medium',
            targetDate: goals?.find((g) => g.id === editId)?.targetDate ?? '',
          }}
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'priority', label: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
            { name: 'targetDate', label: 'Target Date', type: 'date' },
          ]}
          onSubmit={(vals) => {
            updateGoal.mutate({ id: editId, title: vals.title, description: vals.description || undefined, priority: vals.priority || undefined, targetDate: vals.targetDate || undefined });
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      <div className="space-y-2">
        {goals?.map((goal, i) => (
          <div
            key={goal.id}
            onClick={() => setDetailId(goal.id)}
            data-selected={i === selectedIdx ? '' : undefined}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors cursor-pointer ${
              i === selectedIdx ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]' : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{goal.title}</span>
              <div className="flex items-center gap-1 shrink-0">
                {goal.status !== 'done' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goalsApi.markDone(spaceId, goal.id).then(refreshGoals); }}
                    className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-success)] hover:border-[var(--color-success)] transition-colors"
                  >
                    Done
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(goal.id); }}
                  className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:border-[var(--color-border-active)] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(goal.id); }}
                  className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={goal.status} />
              <PriorityBadge priority={goal.priority} />
            </div>
            <ProgressBar value={goal.progress} className="w-full mt-2" />
          </div>
        ))}
        {goals?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">🎯</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {filter === 'all' ? 'No goals yet — press n to create one' : `No ${filter} goals`}
            </p>
          </div>
        )}
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
