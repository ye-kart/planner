import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { SCREEN_LABELS } from '../types.js';
import type { Screen } from '../types.js';
import { useAnimation } from '../hooks/use-animation.js';

interface TopBarProps {
  screen: Screen;
}

export function TopBar({ screen }: TopBarProps) {
  const { colors, themeName } = useTheme();
  const frame = useAnimation(500);
  const flash = frame % 2 === 0;

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        <Text color={colors.accent1} bold>{flash ? '◆' : '◇'}</Text>
        <Text color={colors.textPrimary} bold>PLANNER</Text>
        <Text color={colors.textSecondary}>│</Text>
        <Text color={colors.textAccent} bold>{SCREEN_LABELS[screen]}</Text>
      </Box>
      <Box gap={1}>
        <Text color={colors.textSecondary}>{dateStr}</Text>
        <Text color={colors.textSecondary}>│</Text>
        <Text color={colors.accent2}>{themeName}</Text>
      </Box>
    </Box>
  );
}
