import { Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';

interface StatusBadgeProps {
  status: string;
}

const STATUS_ICONS: Record<string, string> = {
  todo: '○',
  in_progress: '◑',
  done: '●',
  active: '◑',
  archived: '◌',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { colors } = useTheme();

  const colorMap: Record<string, string> = {
    todo: colors.textSecondary,
    in_progress: colors.warning,
    done: colors.success,
    active: colors.accent1,
    archived: colors.textSecondary,
  };

  return (
    <Text color={colorMap[status] ?? colors.textSecondary}>
      {STATUS_ICONS[status] ?? '○'} {status.replace('_', ' ')}
    </Text>
  );
}
