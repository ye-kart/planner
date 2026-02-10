import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { PriorityBadge } from '../components/priority-badge.js';
import { ProgressBar } from '../components/progress-bar.js';
import { ListNavigator } from '../components/list-navigator.js';
import type { Goal } from '../../db/schema.js';
import type { GoalDetail } from '../../services/goal.service.js';

interface GoalsScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
}

export function GoalsScreen({ refreshKey, refresh, searchQuery }: GoalsScreenProps) {
  const { colors } = useTheme();
  const { goalService } = useServices();

  const getGoals = (): Goal[] => {
    try { return goalService.list({ status: 'active' }); } catch { return []; }
  };
  const [goals, setGoals] = useState<Goal[]>(getGoals);
  const [detail, setDetail] = useState<GoalDetail | null>(null);

  useEffect(() => {
    setGoals(getGoals());
  }, [refreshKey]);

  const filtered = goals.filter(g =>
    !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback((goal: Goal) => {
    try {
      setDetail(goalService.show(goal.id));
    } catch {
      // ignore
    }
  }, [goalService]);

  useInput((input, key) => {
    if (detail && (key.backspace || key.delete || key.escape || input === 'h')) {
      setDetail(null);
    }
  });

  if (detail) {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title={`🎯 ${detail.title}`}>
          <Box gap={1}>
            <PriorityBadge priority={detail.priority} />
            <Text color={colors.textSecondary}>
              {detail.status} {detail.targetDate ? `· target: ${detail.targetDate}` : ''}
            </Text>
          </Box>
          {detail.description && (
            <Text color={colors.textPrimary}>{detail.description}</Text>
          )}
          <Box marginTop={1}>
            <ProgressBar value={detail.progress} width={30} />
          </Box>
        </Panel>

        {detail.milestones.length > 0 && (
          <Panel title="📌 Milestones">
            {detail.milestones.map(ms => (
              <Box key={ms.id} gap={1}>
                <Text color={ms.done ? colors.success : colors.textSecondary}>
                  {ms.done ? '●' : '○'}
                </Text>
                <Text
                  color={ms.done ? colors.success : colors.textPrimary}
                  strikethrough={ms.done}
                >
                  {ms.title}
                </Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.tasks.length > 0 && (
          <Panel title="📋 Linked Tasks">
            {detail.tasks.map(t => (
              <Box key={t.id} gap={1}>
                <Text color={colors.textSecondary}>
                  {t.status === 'done' ? '●' : t.status === 'in_progress' ? '◑' : '○'}
                </Text>
                <Text color={colors.textPrimary}>{t.title}</Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.habits.length > 0 && (
          <Panel title="🔄 Linked Habits">
            {detail.habits.map(h => (
              <Box key={h.id} gap={1}>
                <Text color={colors.textPrimary}>{h.title}</Text>
                <Text color={colors.textSecondary}>streak: {h.currentStreak}d</Text>
              </Box>
            ))}
          </Panel>
        )}

        <Text color={colors.textSecondary} italic>Backspace: back to list</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title="🎯 Goals">
        <ListNavigator
          items={filtered}
          emptyMessage="No active goals"
          onSelect={handleSelect}
          renderItem={(goal, _i, selected) => (
            <Box gap={1}>
              <PriorityBadge priority={goal.priority} />
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                bold={selected}
              >
                {goal.title}
              </Text>
              <ProgressBar value={goal.progress} width={15} animated={false} />
              {goal.targetDate && (
                <Text color={colors.textSecondary}>[{goal.targetDate}]</Text>
              )}
            </Box>
          )}
        />
        <Box marginTop={1}>
          <Text color={colors.textSecondary} italic>Enter: view details</Text>
        </Box>
      </Panel>
    </Box>
  );
}
