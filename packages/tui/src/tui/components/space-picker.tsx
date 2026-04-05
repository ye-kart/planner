import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { useTheme } from '../hooks/use-theme.js';
import type { Space } from '@planner/core';

interface SpacePickerProps {
  spaces: Space[];
  currentSpaceId: string;
  onSelect: (spaceId: string) => void;
  onCancel: () => void;
}

export function SpacePicker({ spaces, currentSpaceId, onSelect, onCancel }: SpacePickerProps) {
  const { colors } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(
    Math.max(0, spaces.findIndex(s => s.id === currentSpaceId))
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      const space = spaces[selectedIdx];
      if (space) onSelect(space.id);
      return;
    }
    if (input === 'j' || key.downArrow) {
      setSelectedIdx(i => Math.min(i + 1, spaces.length - 1));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setSelectedIdx(i => Math.max(i - 1, 0));
      return;
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={colors.borderActive} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={colors.textAccent} bold>Switch Space</Text>
        <Text color={colors.textSecondary}> (j/k Enter Esc)</Text>
      </Box>
      {spaces.map((space, i) => {
        const isSelected = i === selectedIdx;
        const isCurrent = space.id === currentSpaceId;
        const icon = space.icon ?? '📁';
        return (
          <Box key={space.id} gap={1}>
            <Text color={isSelected ? colors.accent1 : colors.textSecondary}>
              {isSelected ? '▸' : ' '}
            </Text>
            <Text color={isSelected ? colors.accent1 : colors.textPrimary} bold={isSelected}>
              {icon} {space.name}
            </Text>
            {isCurrent && <Text color={colors.success}> ●</Text>}
          </Box>
        );
      })}
    </Box>
  );
}
