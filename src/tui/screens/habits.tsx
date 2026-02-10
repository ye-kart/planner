import { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { StreakDisplay } from '../components/streak-display.js';
import { ListNavigator } from '../components/list-navigator.js';
import { Confetti } from '../components/confetti.js';
import type { Habit } from '../../db/schema.js';

interface HabitsScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
}

export function HabitsScreen({ refreshKey, refresh, searchQuery }: HabitsScreenProps) {
  const { colors } = useTheme();
  const { habitService } = useServices();

  const getHabits = (): Array<Habit & { done: boolean }> => {
    try { return habitService.getHabitsDueToday(); } catch { return []; }
  };
  const [habits, setHabits] = useState<Array<Habit & { done: boolean }>>(getHabits);
  const [message, setMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setHabits(getHabits());
  }, [refreshKey]);

  const filtered = habits.filter(h =>
    !searchQuery || h.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = useCallback((habit: Habit & { done: boolean }) => {
    try {
      if (habit.done) {
        habitService.uncheck(habit.id);
      } else {
        habitService.check(habit.id);
        // Show confetti if this was the last unchecked habit
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
  }, [habitService, habits, refresh]);

  const streaks = habitService.streaks();
  const doneCount = habits.filter(h => h.done).length;

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title={`✅ Today's Habits (${doneCount}/${habits.length})`}>
        {showConfetti && <Confetti active={showConfetti} />}
        <ListNavigator
          items={filtered}
          emptyMessage="No habits due today"
          onSelect={handleToggle}
          renderItem={(habit, _i, selected) => (
            <Box gap={1} width="100%">
              <Text color={habit.done ? colors.success : colors.textSecondary}>
                {habit.done ? '[✓]' : '[ ]'}
              </Text>
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                strikethrough={habit.done}
                bold={selected}
              >
                {habit.title}
              </Text>
              <Text color={colors.textSecondary}>{habit.frequency}</Text>
            </Box>
          )}
        />
        {message && <Text color={colors.error}>{message}</Text>}
        <Box marginTop={1}>
          <Text color={colors.textSecondary} italic>Space/Enter: toggle check</Text>
        </Box>
      </Panel>

      {streaks.length > 0 && (
        <Panel title="🔥 Streaks">
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
