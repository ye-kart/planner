import { useState, useEffect } from 'react';
import { Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';

interface ProgressBarProps {
  value: number; // 0-100
  width?: number;
  animated?: boolean;
}

export function ProgressBar({ value, width = 20, animated = true }: ProgressBarProps) {
  const { colors } = useTheme();
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }
    setDisplayValue(0);
    const step = Math.max(1, Math.ceil(value / (width * 2)));
    const id = setInterval(() => {
      setDisplayValue(prev => {
        const next = prev + step;
        if (next >= value) {
          clearInterval(id);
          return value;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(id);
  }, [value, animated, width]);

  const filled = Math.round((displayValue / 100) * width);
  const empty = width - filled;

  return (
    <Text>
      <Text color={colors.progressFill}>{'█'.repeat(filled)}</Text>
      <Text color={colors.progressTrack}>{'░'.repeat(empty)}</Text>
      <Text color={colors.textSecondary}> {displayValue}%</Text>
    </Text>
  );
}
