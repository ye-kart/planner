import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { StreakDisplay } from '../components/streak-display.js';
import { PriorityBadge } from '../components/priority-badge.js';
import type { StatusData } from '../../services/status.service.js';

interface DashboardProps {
  refreshKey: number;
  searchQuery: string;
}

export function DashboardScreen({ refreshKey, searchQuery }: DashboardProps) {
  const { colors } = useTheme();
  const { statusService, habitService } = useServices();
  const getData = (): StatusData | null => {
    try { return statusService.getStatus(); } catch { return null; }
  };
  const [data, setData] = useState<StatusData | null>(getData);

  useEffect(() => {
    setData(getData());
  }, [refreshKey]);

  if (!data) {
    return (
      <Box paddingX={1}>
        <Text color={colors.textSecondary}>No data. Run `plan init` first.</Text>
      </Box>
    );
  }

  const streaks = habitService.streaks();
  const topStreaks = streaks
    .filter(s => s.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 5);

  const matchesSearch = (text: string) =>
    !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase());

  // Habit progress bar
  const { habitsDone, habitsDue } = data.summary;
  const pct = habitsDue > 0 ? Math.round((habitsDone / habitsDue) * 100) : 0;
  const barWidth = 20;
  const filled = habitsDue > 0 ? Math.round((habitsDone / habitsDue) * barWidth) : 0;
  const progressBar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={1}>
        <Panel title="📊 Summary">
          <Text color={colors.textAccent} bold>{data.dateFormatted}</Text>
          <Text color={colors.textPrimary}>
            Tasks due: <Text color={data.summary.tasksDue > 0 ? colors.warning : colors.success} bold>{data.summary.tasksDue}</Text>
          </Text>
          <Text color={colors.textPrimary}>
            Overdue:   <Text color={data.summary.tasksOverdue > 0 ? colors.error : colors.success} bold>{data.summary.tasksOverdue}</Text>
          </Text>
          <Box gap={1}>
            <Text color={colors.textPrimary}>Habits:</Text>
            <Text color={colors.success} bold>{habitsDone}</Text>
            <Text color={colors.textSecondary}>/{habitsDue}</Text>
          </Box>
          <Box gap={1}>
            <Text color={pct === 100 ? colors.success : colors.accent1}>{progressBar}</Text>
            <Text color={pct === 100 ? colors.success : colors.textSecondary}>{pct}%</Text>
          </Box>
        </Panel>

        {topStreaks.length > 0 && (
          <Panel title="🔥 Active Streaks">
            {topStreaks.map(s => (
              <Box key={s.id} gap={1}>
                <Text color={colors.textPrimary}>{s.title}</Text>
                <StreakDisplay streak={s.currentStreak} best={s.bestStreak} />
              </Box>
            ))}
          </Panel>
        )}
      </Box>

      <Box gap={1}>
        <Panel title="📋 Tasks Due Today">
          {data.tasksDueToday.length === 0 ? (
            <Text color={colors.textSecondary} italic>No tasks due today</Text>
          ) : (
            data.tasksDueToday.filter(t => matchesSearch(t.title)).map(task => (
              <Box key={task.id} gap={1}>
                <PriorityBadge priority={task.priority} />
                <Text color={colors.textPrimary}>{task.title}</Text>
              </Box>
            ))
          )}
        </Panel>

        <Panel title="⚠️  Overdue">
          {data.tasksOverdue.length === 0 ? (
            <Text color={colors.success} italic>All clear!</Text>
          ) : (
            data.tasksOverdue.filter(t => matchesSearch(t.title)).map(task => (
              <Box key={task.id} gap={1}>
                <Text color={colors.error} bold>{task.daysOverdue}d</Text>
                <Text color={colors.textPrimary}>{task.title}</Text>
              </Box>
            ))
          )}
        </Panel>
      </Box>

      <Panel title={`✅ Today's Habits (${habitsDone}/${habitsDue})`}>
        {data.habitsDueToday.length === 0 ? (
          <Text color={colors.textSecondary} italic>No habits due today</Text>
        ) : (
          <Box flexDirection="column">
            {data.habitsDueToday.filter(h => matchesSearch(h.title)).map(habit => (
              <Box key={habit.id} gap={1}>
                <Text color={habit.done ? colors.success : colors.textSecondary}>
                  {habit.done ? '[x]' : '[ ]'}
                </Text>
                <Text
                  color={habit.done ? colors.success : colors.textPrimary}
                  strikethrough={habit.done}
                >
                  {habit.title}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Panel>
    </Box>
  );
}
