import { Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useAnimation } from '../hooks/use-animation.js';

interface StreakDisplayProps {
  streak: number;
  best?: number;
}

export function StreakDisplay({ streak, best }: StreakDisplayProps) {
  const { colors } = useTheme();
  const frame = useAnimation(streak >= 30 ? 300 : 500);

  if (streak === 0) {
    return <Text color={colors.textSecondary}>no streak</Text>;
  }

  const pulse = frame % 2 === 0;
  const fireEmoji = streak >= 30 ? '🔥🔥' : streak >= 7 ? '🔥' : '•';
  const fireColor = pulse ? colors.streakFire : colors.warning;

  return (
    <Text>
      <Text color={fireColor}>{fireEmoji}</Text>
      <Text color={colors.textPrimary} bold> {streak}d</Text>
      {best !== undefined && best > streak && (
        <Text color={colors.textSecondary}> (best: {best})</Text>
      )}
    </Text>
  );
}
