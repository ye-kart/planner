import { useStatus, useCheckHabit, useUncheckHabit } from '../hooks/use-api';
import { Panel } from '../components/shared/panel';
import { PriorityBadge } from '../components/shared/priority-badge';
import { StreakDisplay } from '../components/shared/streak-display';

export function DashboardPage() {
  const { data: status, isLoading } = useStatus();
  const checkHabit = useCheckHabit();
  const uncheckHabit = useUncheckHabit();

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
      <div className="grid grid-cols-4 gap-4">
        <Panel>
          <p className="text-2xl font-bold text-[var(--color-accent-1)]">{summary.tasksDue}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Tasks Due</p>
        </Panel>
        <Panel>
          <p className="text-2xl font-bold text-[var(--color-error)]">{summary.tasksOverdue}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Overdue</p>
        </Panel>
        <Panel>
          <p className="text-2xl font-bold text-[var(--color-success)]">{summary.habitsDone}/{summary.habitsDue}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Habits Done</p>
        </Panel>
        <Panel>
          {summary.bestActiveStreak ? (
            <>
              <p className="text-2xl font-bold text-[var(--color-streak-fire)]">{summary.bestActiveStreak.streak}</p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">{summary.bestActiveStreak.habit}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-[var(--color-text-secondary)]">--</p>
              <p className="text-xs text-[var(--color-text-secondary)]">No streaks</p>
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-6">
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
            {habitsDueToday.map((habit) => (
              <li key={habit.id} className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => {
                    if (habit.done) {
                      uncheckHabit.mutate({ id: habit.id });
                    } else {
                      checkHabit.mutate({ id: habit.id });
                    }
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    habit.done
                      ? 'bg-[var(--color-success)] border-[var(--color-success)] text-[var(--color-bg)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-active)]'
                  }`}
                >
                  {habit.done ? '\u2713' : null}
                </button>
                <span className={habit.done ? 'text-[var(--color-text-secondary)] line-through' : 'text-[var(--color-text-primary)]'}>
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
