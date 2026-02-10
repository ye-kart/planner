import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { ListNavigator } from '../components/list-navigator.js';
import type { AreaWithStats, AreaDetail } from '../../services/area.service.js';

interface AreasScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
}

export function AreasScreen({ refreshKey, refresh, searchQuery }: AreasScreenProps) {
  const { colors } = useTheme();
  const { areaService } = useServices();

  const getAreas = (): AreaWithStats[] => {
    try { return areaService.list(); } catch { return []; }
  };
  const [areas, setAreas] = useState<AreaWithStats[]>(getAreas);
  const [detail, setDetail] = useState<AreaDetail | null>(null);

  useEffect(() => {
    setAreas(getAreas());
  }, [refreshKey]);

  const filtered = areas.filter(a =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback((area: AreaWithStats) => {
    try {
      setDetail(areaService.show(area.id));
    } catch {
      // ignore
    }
  }, [areaService]);

  useInput((input, key) => {
    if (detail && (key.backspace || key.delete || key.escape || input === 'h')) {
      setDetail(null);
    }
  });

  if (detail) {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title={`📂 ${detail.name}`}>
          {detail.description && (
            <Text color={colors.textPrimary}>{detail.description}</Text>
          )}
        </Panel>

        {detail.goals.length > 0 && (
          <Panel title="🎯 Goals">
            {detail.goals.map(g => (
              <Box key={g.id} gap={1}>
                <Text color={g.status === 'done' ? colors.success : colors.textPrimary}>
                  {g.status === 'done' ? '●' : g.status === 'active' ? '◑' : '◌'}
                </Text>
                <Text color={colors.textPrimary}>{g.title}</Text>
                <Text color={colors.textSecondary}>{g.progress}%</Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.tasks.length > 0 && (
          <Panel title="📋 Tasks">
            {detail.tasks.map(t => (
              <Box key={t.id} gap={1}>
                <Text color={colors.textSecondary}>
                  {t.status === 'done' ? '●' : t.status === 'in_progress' ? '◑' : '○'}
                </Text>
                <Text
                  color={colors.textPrimary}
                  strikethrough={t.status === 'done'}
                >
                  {t.title}
                </Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.habits.length > 0 && (
          <Panel title="🔄 Habits">
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
      <Panel title="📂 Areas">
        <ListNavigator
          items={filtered}
          emptyMessage="No areas found"
          onSelect={handleSelect}
          renderItem={(area, _i, selected) => (
            <Box gap={1}>
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                bold={selected}
              >
                {area.name}
              </Text>
              <Text color={colors.textSecondary}>
                {area.goalCount}g {area.taskCount}t {area.habitCount}h
              </Text>
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
