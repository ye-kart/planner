import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';

interface HintBarProps {
  hints: string[]; // format: "key:label" e.g. ["↑↓:move", "Space:check"]
}

export function HintBar({ hints }: HintBarProps) {
  const { colors } = useTheme();

  return (
    <Box marginTop={1} gap={1}>
      {hints.map((hint, i) => {
        const colonIdx = hint.indexOf(':');
        const key = hint.slice(0, colonIdx);
        const label = hint.slice(colonIdx + 1);
        return (
          <Box key={i} gap={0}>
            <Text color={colors.accent2} bold>{key}</Text>
            <Text color={colors.textSecondary}>:{label}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
