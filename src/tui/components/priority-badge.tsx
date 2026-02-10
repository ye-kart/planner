import { Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';

interface PriorityBadgeProps {
  priority: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
  urgent: 'URG',
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { colors } = useTheme();

  const colorMap: Record<string, string> = {
    low: colors.priorityLow,
    medium: colors.priorityMed,
    high: colors.priorityHigh,
    urgent: colors.priorityUrgent,
  };

  return (
    <Text color={colorMap[priority] ?? colors.textSecondary} bold>
      {PRIORITY_LABELS[priority] ?? priority}
    </Text>
  );
}
