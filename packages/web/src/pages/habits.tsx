import { useState, useEffect } from 'react';
import { useHabits, useHabitsToday, useCreateHabit, useDeleteHabit, useCheckHabit, useUncheckHabit } from '../hooks/use-api';
import { useKeyboardStore } from '../stores/keyboard.store';
import { StreakDisplay } from '../components/shared/streak-display';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';

export function HabitsPage() {
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const { data: allHabits } = useHabits();
  const { data: todayHabits } = useHabitsToday();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const checkHabit = useCheckHabit();
  const uncheckHabit = useUncheckHabit();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { inputFocused, overlayOpen } = useKeyboardStore();

  const displayItems = viewMode === 'today' ? todayHabits : allHabits;
  const isToday = viewMode === 'today';

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!displayItems) return;

      switch (e.key) {
        case 'j': case 'ArrowDown':
          setSelectedIdx((i) => Math.min(i + 1, displayItems.length - 1));
          break;
        case 'k': case 'ArrowUp':
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'x':
          if (displayItems[selectedIdx]) setDeleteId(displayItems[selectedIdx].id);
          break;
        case 'v':
          setViewMode((m) => m === 'today' ? 'all' : 'today');
          setSelectedIdx(0);
          break;
        case ' ':
          e.preventDefault();
          if (isToday && todayHabits?.[selectedIdx]) {
            const habit = todayHabits[selectedIdx];
            if (habit.done) {
              uncheckHabit.mutate({ id: habit.id });
            } else {
              checkHabit.mutate({ id: habit.id });
            }
          }
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inputFocused, overlayOpen, displayItems, selectedIdx, isToday, todayHabits, checkHabit, uncheckHabit]);

  const allDone = isToday && todayHabits && todayHabits.length > 0 && todayHabits.every((h) => h.done);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">
          Habits
          {allDone && <span className="ml-2 text-[var(--color-success)]">\u2728 All done!</span>}
        </h1>
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-sm rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90">
          + New Habit
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setViewMode('today'); setSelectedIdx(0); }}
          className={`px-3 py-1 text-xs rounded ${viewMode === 'today' ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)]'}`}
        >
          Today
        </button>
        <button
          onClick={() => { setViewMode('all'); setSelectedIdx(0); }}
          className={`px-3 py-1 text-xs rounded ${viewMode === 'all' ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)]'}`}
        >
          All
        </button>
      </div>

      <InlineForm
        open={showAdd}
        fields={[
          { name: 'title', label: 'Title', required: true },
        ]}
        onSubmit={(vals) => {
          createHabit.mutate({ title: vals.title });
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      <div className="space-y-1">
        {displayItems?.map((habit, i) => {
          const isDone = 'done' in habit ? habit.done : false;
          return (
            <div
              key={habit.id}
              className={`px-4 py-3 rounded flex items-center justify-between transition-colors cursor-pointer ${
                i === selectedIdx ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]' : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
              }`}
              onClick={() => {
                setSelectedIdx(i);
                if (isToday) {
                  if (isDone) {
                    uncheckHabit.mutate({ id: habit.id });
                  } else {
                    checkHabit.mutate({ id: habit.id });
                  }
                }
              }}
            >
              <div className="flex items-center gap-3">
                {isToday && (
                  <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                    isDone
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)]'
                  }`}>
                    {isDone ? '\u2713' : null}
                  </div>
                )}
                <span className={`text-sm ${isDone ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {habit.title}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] font-mono">{habit.frequency}</span>
              </div>
              <StreakDisplay current={habit.currentStreak} best={habit.bestStreak} />
            </div>
          );
        })}
        {displayItems?.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isToday ? 'No habits due today' : 'No habits yet'}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Habit"
        message="This will permanently delete the habit and all its completions."
        onConfirm={() => { if (deleteId) deleteHabit.mutate(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
