import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { SCREEN_LABELS, SCREEN_ORDER } from '../types.js';
import type { Screen } from '../types.js';
import { useAnimation } from '../hooks/use-animation.js';

interface TopBarProps {
  screen: Screen;
  chatConfigured?: boolean;
}

export function TopBar({ screen, chatConfigured }: TopBarProps) {
  const { colors, themeName } = useTheme();
  const frame = useAnimation(500);
  const flash = frame % 2 === 0;

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const hints = 't:theme /:search' + (chatConfigured ? ' c:chat' : '') + ' q:quit';

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between" paddingX={1}>
        <Box gap={1}>
          <Text color={colors.accent1} bold>{flash ? '◆' : '◇'}</Text>
          <Text color={colors.textPrimary} bold>PLANNER</Text>
        </Box>
        <Box gap={1}>
          <Text color={colors.textSecondary}>{dateStr}</Text>
          <Text color={colors.textSecondary}>│</Text>
          <Text color={colors.accent2}>{themeName}</Text>
        </Box>
      </Box>
      <Box paddingX={1} gap={1}>
        {SCREEN_ORDER.map((s, i) => (
          <Box key={s} gap={0}>
            <Text color={s === screen ? colors.tabActive : colors.tabInactive} bold={s === screen}>
              [{i + 1}]{SCREEN_LABELS[s]}
            </Text>
          </Box>
        ))}
        <Box flexGrow={1} />
        <Text color={colors.textSecondary}>{hints}</Text>
      </Box>
    </Box>
  );
}
