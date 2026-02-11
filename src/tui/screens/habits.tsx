import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { StreakDisplay } from '../components/streak-display.js';
import { ListNavigator } from '../components/list-navigator.js';
import { Confetti } from '../components/confetti.js';
import { HintBar } from '../components/hint-bar.js';
import { InlineForm } from '../components/inline-form.js';
import type { FormFieldDef } from '../components/inline-form.js';
import type { Habit } from '../../db/schema.js';
import type { HabitDetail } from '../../services/habit.service.js';

type Mode = 'list' | 'detail' | 'add' | 'edit';
type ViewMode = 'today' | 'all';

interface HabitsScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
  setInputActive: (active: boolean) => void;
}

export function HabitsScreen({ refreshKey, refresh, searchQuery, setInputActive }: HabitsScreenProps) {
  const { colors } = useTheme();
  const { habitService, areaService, goalService } = useServices();

  const [mode, setMode] = useState<Mode>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedHabit, setSelectedHabit] = useState<(Habit & { done: boolean }) | null>(null);
  const [detail, setDetail] = useState<HabitDetail | null>(null);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getHabits = (): Array<Habit & { done: boolean }> => {
    try {
      if (viewMode === 'today') {
        return habitService.getHabitsDueToday();
      }
      // 'all' view: show all habits (active + archived) with done flag
      const allHabits = habitService.list();
      const todayHabits = habitService.getHabitsDueToday();
      const doneIds = new Set(todayHabits.filter(h => h.done).map(h => h.id));
      return allHabits.map(h => ({ ...h, done: doneIds.has(h.id) }));
    } catch { return []; }
  };
  const [habits, setHabits] = useState<Array<Habit & { done: boolean }>>(getHabits);

  useEffect(() => {
    setHabits(getHabits());
  }, [refreshKey, viewMode]);

  // Build form fields dynamically (areas/goals as select options)
  const buildFormFields = useCallback((): FormFieldDef[] => {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();
    const goals = (() => { try { return goalService.list(); } catch { return []; } })();

    return [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'frequency', label: 'Frequency', type: 'select', options: ['daily', 'weekly', 'specific_days'] },
      { key: 'days', label: 'Days', type: 'text', placeholder: '0-6 comma-separated (Sun=0)' },
      ...(areas.length > 0 ? [{
        key: 'area', label: 'Area', type: 'select' as const,
        options: ['(none)', ...areas.map(a => a.name)],
      }] : []),
      ...(goals.length > 0 ? [{
        key: 'goal', label: 'Goal', type: 'select' as const,
        options: ['(none)', ...goals.map(g => g.title)],
      }] : []),
    ];
  }, [areaService, goalService]);

  const resolveAreaId = useCallback((name: string | undefined): string | undefined => {
    if (!name || name === '(none)') return undefined;
    try {
      const areas = areaService.list();
      return areas.find(a => a.name === name)?.id;
    } catch { return undefined; }
  }, [areaService]);

  const resolveGoalId = useCallback((title: string | undefined): string | undefined => {
    if (!title || title === '(none)') return undefined;
    try {
      const goals = goalService.list();
      return goals.find(g => g.title === title)?.id;
    } catch { return undefined; }
  }, [goalService]);

  const filtered = habits.filter(h =>
    !searchQuery || h.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = useCallback((habit: Habit & { done: boolean }) => {
    if (mode !== 'list') return;
    try {
      if (habit.done) {
        habitService.uncheck(habit.id);
      } else {
        habitService.check(habit.id);
        const remaining = habits.filter(h => !h.done && h.id !== habit.id);
        if (remaining.length === 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1000);
        }
      }
      setMessage('');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
    }
  }, [habitService, habits, refresh, mode]);

  const handleAction = useCallback((key: string, habit: Habit & { done: boolean }) => {
    if (mode !== 'list') return;
    if (key === ' ') {
      handleToggle(habit);
      return;
    }
    if (key === 'e') {
      setSelectedHabit(habit);
      setMode('edit');
    } else if (key === 'a') {
      try {
        habitService.archive(habit.id);
        setMessage(`Archived "${habit.title}"`);
        refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error');
      }
    } else if (key === 'n') {
      setMode('add');
    } else if (key === 'x') {
      if (deleteConfirm === habit.id) {
        try {
          habitService.remove(habit.id);
          setMessage(`Deleted "${habit.title}"`);
          setDeleteConfirm(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
      } else {
        setDeleteConfirm(habit.id);
        setMessage(`Press x again to delete "${habit.title}"`);
      }
    } else if (key === 'v') {
      setViewMode(prev => prev === 'today' ? 'all' : 'today');
      setMessage('');
    } else if (key === 'r' && viewMode === 'all' && !habit.active) {
      try {
        habitService.restore(habit.id);
        setMessage(`Restored "${habit.title}"`);
        refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error');
      }
    }
  }, [mode, deleteConfirm, habitService, refresh, viewMode]);

  const handleCursorChange = useCallback(() => {
    if (deleteConfirm) {
      setDeleteConfirm(null);
      setMessage('');
    }
  }, [deleteConfirm]);

  const handleSelect = useCallback((habit: Habit & { done: boolean }) => {
    if (mode !== 'list') return;
    try {
      setDetail(habitService.show(habit.id));
      setSelectedHabit(habit);
      setMode('detail');
    } catch {
      // fallback to toggle for backwards compatibility
      handleToggle(habit);
    }
  }, [mode, habitService, handleToggle]);

  const handleAddSubmit = useCallback((values: Record<string, string>) => {
    try {
      const title = values['title']!.trim();
      const freq = values['frequency'] || 'daily';
      const daysStr = values['days']?.trim();
      const days = daysStr ? daysStr.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n)) : undefined;
      const areaId = resolveAreaId(values['area']);
      const goalId = resolveGoalId(values['goal']);
      habitService.add(title, { frequency: freq, days, areaId, goalId });
      setMessage(`Added "${title}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [habitService, refresh, resolveAreaId, resolveGoalId]);

  const handleEditSubmit = useCallback((values: Record<string, string>) => {
    if (!selectedHabit) return;
    try {
      const updates: { title?: string; frequency?: string; days?: number[]; areaId?: string | null; goalId?: string | null } = {};
      const title = values['title']?.trim();
      if (title && title !== selectedHabit.title) updates.title = title;
      const freq = values['frequency'];
      if (freq && freq !== selectedHabit.frequency) updates.frequency = freq;
      const daysStr = values['days']?.trim();
      if (daysStr) {
        updates.days = daysStr.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
      }
      const areaId = resolveAreaId(values['area']);
      updates.areaId = areaId ?? null;
      const goalId = resolveGoalId(values['goal']);
      updates.goalId = goalId ?? null;

      habitService.edit(selectedHabit.id, updates);
      setMessage(`Updated "${title || selectedHabit.title}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [selectedHabit, habitService, refresh, resolveAreaId, resolveGoalId]);

  const handleCancel = useCallback(() => {
    setMode('list');
    setMessage('');
  }, []);

  // Global keys for detail mode and list shortcuts
  useInput((input, key) => {
    if (mode === 'add' || mode === 'edit') return;

    if (mode === 'detail') {
      if (key.backspace || key.delete || key.escape || input === 'h') {
        setMode('list');
        setDetail(null);
        return;
      }
      if (input === 'e' && detail) {
        const habit = habits.find(h => h.id === detail.id);
        if (habit) {
          setSelectedHabit(habit);
          setMode('edit');
        }
        return;
      }
      if (input === 'x' && detail) {
        if (deleteConfirm === detail.id) {
          try {
            habitService.remove(detail.id);
            setMessage(`Deleted "${detail.title}"`);
            setDeleteConfirm(null);
            setMode('list');
            setDetail(null);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Error');
          }
        } else {
          setDeleteConfirm(detail.id);
          setMessage(`Press x again to delete "${detail.title}"`);
        }
        return;
      }
      return;
    }

    // List mode shortcuts
    if (input === 'n') {
      setMode('add');
    } else if (input === 'v') {
      setViewMode(prev => prev === 'today' ? 'all' : 'today');
      setMessage('');
    }
  });

  const streaks = (() => {
    try { return habitService.streaks(); } catch { return []; }
  })();
  const doneCount = habits.filter(h => h.done).length;

  // ── Add mode ──────────────────────────────────────
  if (mode === 'add') {
    return (
      <InlineForm
        title="+ Add Habit"
        fields={buildFormFields()}
        onSubmit={handleAddSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Edit mode ──────────────────────────────────────
  if (mode === 'edit' && selectedHabit) {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();
    const goals = (() => { try { return goalService.list(); } catch { return []; } })();
    const areaName = areas.find(a => a.id === selectedHabit.areaId)?.name || '(none)';
    const goalTitle = goals.find(g => g.id === selectedHabit.goalId)?.title || '(none)';
    const daysStr = selectedHabit.days ? JSON.parse(selectedHabit.days).join(', ') : '';

    return (
      <InlineForm
        title={`Edit: ${selectedHabit.title}`}
        fields={buildFormFields()}
        initialValues={{
          title: selectedHabit.title,
          frequency: selectedHabit.frequency,
          days: daysStr,
          area: areaName,
          goal: goalTitle,
        }}
        onSubmit={handleEditSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Detail view ──────────────────────────────────────
  if (mode === 'detail' && detail) {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title={`${detail.title}`}>
          <Box flexDirection="column" gap={0}>
            <Box gap={1}>
              <Text color={colors.textSecondary}>Frequency:</Text>
              <Text color={colors.textPrimary}>{detail.frequency}</Text>
              {detail.days && (
                <Text color={colors.textSecondary}>
                  (days: {JSON.parse(detail.days).join(', ')})
                </Text>
              )}
            </Box>
            <Box gap={1}>
              <Text color={colors.textSecondary}>Status:</Text>
              <Text color={detail.active ? colors.success : colors.warning}>
                {detail.active ? 'active' : 'archived'}
              </Text>
            </Box>
            {detail.area && (
              <Box gap={1}>
                <Text color={colors.textSecondary}>Area:</Text>
                <Text color={colors.textPrimary}>{detail.area.name}</Text>
              </Box>
            )}
            {detail.goal && (
              <Box gap={1}>
                <Text color={colors.textSecondary}>Goal:</Text>
                <Text color={colors.textPrimary}>{detail.goal.title}</Text>
              </Box>
            )}
            <Box gap={1}>
              <Text color={colors.textSecondary}>Streak:</Text>
              <StreakDisplay streak={detail.currentStreak} best={detail.bestStreak} />
            </Box>
          </Box>
        </Panel>

        {detail.recentCompletions.length > 0 && (
          <Panel title="Recent Completions">
            {detail.recentCompletions.slice(0, 10).map(c => (
              <Box key={c.id} gap={1}>
                <Text color={colors.success}>{'●'}</Text>
                <Text color={colors.textPrimary}>{c.date}</Text>
              </Box>
            ))}
          </Panel>
        )}

        {message && (
          <Box>
            <Text color={message.startsWith('Press') ? colors.warning : colors.success}>{message}</Text>
          </Box>
        )}
        <HintBar hints={['Bksp:back', 'e:edit', 'x:delete']} />
      </Box>
    );
  }

  // ── List mode ──────────────────────────────────────
  const panelTitle = viewMode === 'today'
    ? `Today's Habits (${doneCount}/${habits.length})`
    : `All Habits (${habits.length})`;

  const listHints = viewMode === 'today'
    ? ['Enter:detail', 'Space:toggle', 'n:add', 'e:edit', 'a:archive', 'x:delete', 'v:all']
    : ['Enter:detail', 'n:add', 'e:edit', 'a:archive', 'r:restore', 'x:delete', 'v:today'];

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title={panelTitle}>
        {showConfetti && <Confetti active={showConfetti} />}
        <ListNavigator
          items={filtered}
          emptyMessage={viewMode === 'today'
            ? 'No habits due today — press n to add one'
            : 'No habits found — press n to add one'}
          onSelect={handleSelect}
          onAction={handleAction}
          onCursorChange={handleCursorChange}
          renderItem={(habit, _i, selected) => (
            <Box gap={1} width="100%">
              <Text color={habit.done ? colors.success : colors.textSecondary}>
                {habit.done ? '[x]' : '[ ]'}
              </Text>
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                strikethrough={habit.done}
                bold={selected}
              >
                {habit.title}
              </Text>
              <Text color={colors.textSecondary} dimColor>{habit.frequency}</Text>
              {!habit.active && (
                <Text color={colors.warning}>[archived]</Text>
              )}
            </Box>
          )}
        />
        {message && (
          <Box marginTop={1}>
            <Text color={message.startsWith('Press') ? colors.warning
              : message.startsWith('Archived') || message.startsWith('Updated')
                || message.startsWith('Added') || message.startsWith('Deleted')
                || message.startsWith('Restored')
                ? colors.success : colors.error}>
              {message}
            </Text>
          </Box>
        )}
        <HintBar hints={listHints} />
      </Panel>

      {streaks.length > 0 && (
        <Panel title="Streaks">
          {streaks
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .slice(0, 8)
            .map(s => (
              <Box key={s.id} gap={1} justifyContent="space-between">
                <Text color={colors.textPrimary}>{s.title}</Text>
                <StreakDisplay streak={s.currentStreak} best={s.bestStreak} />
              </Box>
            ))}
        </Panel>
      )}
    </Box>
  );
}
