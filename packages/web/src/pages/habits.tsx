import { useState, useEffect } from 'react';
import { useHabits, useHabitsToday, useCreateHabit, useUpdateHabit, useDeleteHabit, useCheckHabit, useUncheckHabit } from '../hooks/use-api';
import { useKeyboardStore } from '../stores/keyboard.store';
import { StreakDisplay } from '../components/shared/streak-display';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';
import type { Habit } from '../api/types';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'specific_days', label: 'Specific days' },
];

/** Stored as a JSON array string e.g. "[1,3,5]" → "1,3,5" for the form. */
function daysToInput(days: string | null | undefined): string {
  if (!days) return '';
  try {
    return (JSON.parse(days) as number[]).join(',');
  } catch {
    return '';
  }
}

function inputToDays(s: string): number[] {
  return s
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
}

export function HabitsPage() {
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const { data: allHabits } = useHabits();
  const { data: todayHabits } = useHabitsToday();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const checkHabit = useCheckHabit();
  const uncheckHabit = useUncheckHabit();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { inputFocused, overlayOpen } = useKeyboardStore();

  const displayItems = viewMode === 'today' ? todayHabits : allHabits;
  const isToday = viewMode === 'today';

  const editHabit: Habit | undefined = (allHabits ?? todayHabits)?.find((h) => h.id === editId);

  function submitHabit(vals: Record<string, string>, id?: string) {
    const frequency = vals.frequency || 'daily';
    const days = frequency === 'specific_days' ? inputToDays(vals.days || '') : undefined;
    if (id) {
      updateHabit.mutate({ id, title: vals.title, frequency, days });
    } else {
      createHabit.mutate({ title: vals.title, frequency, days });
    }
  }

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

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
        case 'Home':
          setSelectedIdx(0);
          break;
        case 'End':
          setSelectedIdx(displayItems.length - 1);
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'e':
          if (displayItems[selectedIdx]) setEditId(displayItems[selectedIdx].id);
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

  const habitFields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'frequency', label: 'Frequency', type: 'select' as const, options: FREQUENCY_OPTIONS },
    { name: 'days', label: 'Days (specific days only — e.g. 1,3,5; 0=Sun)', placeholder: '1,3,5' },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">
          Habits
          {allDone && <span className="ml-2 text-[var(--color-success)]">{'✨'} All done!</span>}
        </h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90 active:opacity-80 transition-opacity">
          + New Habit
        </button>
      </div>

      <div className="flex gap-1.5 bg-[var(--color-bg-panel)] rounded-lg p-1 border border-[var(--color-border)] max-w-[200px]">
        <button
          onClick={() => { setViewMode('today'); setSelectedIdx(0); }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${viewMode === 'today' ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)]'}`}
        >
          Today
        </button>
        <button
          onClick={() => { setViewMode('all'); setSelectedIdx(0); }}
          className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${viewMode === 'all' ? 'bg-[var(--color-tab-active)] text-[var(--color-bg)]' : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)]'}`}
        >
          All
        </button>
      </div>

      <InlineForm
        open={showAdd}
        initialValues={{ frequency: 'daily' }}
        fields={habitFields}
        onSubmit={(vals) => {
          submitHabit(vals);
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      {editId && (
        <InlineForm
          open
          initialValues={{
            title: editHabit?.title ?? '',
            frequency: editHabit?.frequency ?? 'daily',
            days: daysToInput(editHabit?.days),
          }}
          fields={habitFields}
          onSubmit={(vals) => {
            submitHabit(vals, editId);
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      <div className="space-y-2">
        {displayItems?.map((habit, i) => {
          const isDone = 'done' in habit ? habit.done : false;
          return (
            <div
              key={habit.id}
              data-selected={i === selectedIdx ? '' : undefined}
              className={`px-4 py-3 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer ${
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
              <div className="flex items-center gap-3 min-w-0">
                {isToday && (
                  <div className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                    isDone
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)]'
                  }`}>
                    {isDone ? '✓' : null}
                  </div>
                )}
                <span className={`text-sm truncate ${isDone ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {habit.title}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] font-mono shrink-0">{habit.frequency}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StreakDisplay current={habit.currentStreak} best={habit.bestStreak} />
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(habit.id); }}
                  className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:border-[var(--color-border-active)] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(habit.id); }}
                  className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {displayItems?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">{isToday ? '✅' : '🔄'}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isToday ? 'No habits due today' : 'No habits yet — press n to create one'}
            </p>
          </div>
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
