import { useState, useEffect } from 'react';
import { useStatus, useCheckHabit, useUncheckHabit } from '../hooks/use-api';
import { useKeyboardStore } from '../stores/keyboard.store';
import { Panel } from '../components/shared/panel';
import { PriorityBadge } from '../components/shared/priority-badge';
import { StreakDisplay } from '../components/shared/streak-display';

export function DashboardPage() {
  const { data: status, isLoading } = useStatus();
  const checkHabit = useCheckHabit();
  const uncheckHabit = useUncheckHabit();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { inputFocused, overlayOpen } = useKeyboardStore();

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!status) return;

      const { habitsDueToday } = status;
      if (habitsDueToday.length === 0) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          setSelectedIdx((i) => Math.min(i + 1, habitsDueToday.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          setSelectedIdx(0);
          break;
        case 'End':
          setSelectedIdx(habitsDueToday.length - 1);
          break;
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const habit = habitsDueToday[selectedIdx];
          if (habit) {
            if (habit.done) {
              uncheckHabit.mutate({ id: habit.id });
            } else {
              checkHabit.mutate({ id: habit.id });
            }
          }
          break;
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inputFocused, overlayOpen, status, selectedIdx, checkHabit, uncheckHabit]);

  if (isLoading || !status) {
    return <div className="text-[var(--color-text-secondary)]">Loading...</div>;
  }

  const { summary, tasksDueToday, tasksOverdue, habitsDueToday } = status;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">{status.dateFormatted}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Panel>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[var(--color-text-secondary)]">Tasks Due</p>
            <span className="text-base opacity-60">{'>'}</span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-accent-1)]">{summary.tasksDue}</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[var(--color-text-secondary)]">Overdue</p>
            <span className="text-base opacity-60">!</span>
          </div>
          <p className={`text-2xl font-bold ${summary.tasksOverdue > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>{summary.tasksOverdue}</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[var(--color-text-secondary)]">Habits Done</p>
            <span className="text-base opacity-60">+</span>
          </div>
          <p className="text-2xl font-bold text-[var(--color-success)]">{summary.habitsDone}/{summary.habitsDue}</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[var(--color-text-secondary)]">{summary.bestActiveStreak ? summary.bestActiveStreak.habit : 'Streaks'}</p>
            <span className="text-base opacity-60">~</span>
          </div>
          {summary.bestActiveStreak ? (
            <p className="text-2xl font-bold text-[var(--color-streak-fire)]">{summary.bestActiveStreak.streak}</p>
          ) : (
            <p className="text-2xl font-bold text-[var(--color-text-secondary)]">--</p>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Tasks due today */}
        <Panel title={`Tasks Due Today (${tasksDueToday.length})`}>
          {tasksDueToday.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">All clear!</p>
          ) : (
            <ul className="space-y-2">
              {tasksDueToday.map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[var(--color-text-primary)]">{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Overdue tasks */}
        <Panel title={`Overdue (${tasksOverdue.length})`}>
          {tasksOverdue.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Nothing overdue</p>
          ) : (
            <ul className="space-y-2">
              {tasksOverdue.map((task) => (
                <li key={task.id} className="flex items-center gap-2 text-sm">
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[var(--color-error)]">{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Habits checklist */}
      <Panel title={`Today's Habits (${summary.habitsDone}/${summary.habitsDue})`}>
        {habitsDueToday.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No habits due today</p>
        ) : (
          <ul className="space-y-2">
            {habitsDueToday.map((habit, i) => (
              <li
                key={habit.id}
                data-selected={i === selectedIdx ? '' : undefined}
                className={`flex items-center gap-3 text-sm rounded-lg px-3 py-2 transition-colors cursor-pointer ${
                  i === selectedIdx ? 'bg-[var(--color-bg-highlight)]' : 'hover:bg-[var(--color-bg-highlight)]'
                }`}
                onClick={() => {
                  if (habit.done) {
                    uncheckHabit.mutate({ id: habit.id });
                  } else {
                    checkHabit.mutate({ id: habit.id });
                  }
                }}
              >
                <div
                  className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                    habit.done
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-active)]'
                  }`}
                >
                  {habit.done ? '\u2713' : null}
                </div>
                <span className={`flex-1 ${habit.done ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}`}>
                  {habit.title}
                </span>
                <StreakDisplay current={habit.currentStreak} best={habit.bestStreak} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
