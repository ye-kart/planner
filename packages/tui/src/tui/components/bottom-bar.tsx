import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { SCREEN_ORDER, SCREEN_LABELS, type Screen } from '../types.js';

interface BottomBarProps {
  screen: Screen;
}

export function BottomBar({ screen }: BottomBarProps) {
  const { colors } = useTheme();

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        {SCREEN_ORDER.map((s, i) => (
          <Box key={s} gap={0}>
            <Text color={s === screen ? colors.tabActive : colors.tabInactive} bold={s === screen}>
              [{i + 1}]{SCREEN_LABELS[s]}
            </Text>
            {i < SCREEN_ORDER.length - 1 && <Text color={colors.textSecondary}> </Text>}
          </Box>
        ))}
      </Box>
      <Box gap={1}>
        <Text color={colors.textSecondary}>t:theme</Text>
        <Text color={colors.textSecondary}>/:search</Text>
        <Text color={colors.textSecondary}>q:quit</Text>
      </Box>
    </Box>
  );
}
