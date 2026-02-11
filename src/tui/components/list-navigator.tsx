import { useState, useEffect, type ReactNode } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/use-theme.js';

interface ListNavigatorProps<T> {
  items: T[];
  renderItem: (item: T, index: number, selected: boolean) => ReactNode;
  onSelect?: (item: T, index: number) => void;
  onAction?: (key: string, item: T, index: number) => void;
  onCursorChange?: (index: number) => void;
  active?: boolean;
  emptyMessage?: string;
}

export function ListNavigator<T>({
  items,
  renderItem,
  onSelect,
  onAction,
  onCursorChange,
  active = true,
  emptyMessage = 'No items',
}: ListNavigatorProps<T>) {
  const { colors } = useTheme();
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (cursor >= items.length && items.length > 0) {
      setCursor(items.length - 1);
    }
  }, [items.length, cursor]);

  useInput((input, key) => {
    if (!active || items.length === 0) return;

    if (input === 'j' || key.downArrow) {
      setCursor(c => {
        const next = Math.min(c + 1, items.length - 1);
        if (next !== c) onCursorChange?.(next);
        return next;
      });
    } else if (input === 'k' || key.upArrow) {
      setCursor(c => {
        const next = Math.max(c - 1, 0);
        if (next !== c) onCursorChange?.(next);
        return next;
      });
    } else if (key.return) {
      onSelect?.(items[cursor]!, cursor);
    } else if (onAction) {
      onAction(input, items[cursor]!, cursor);
    }
  });

  if (items.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color={colors.textSecondary} italic>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <Box key={i}>
          <Text color={i === cursor ? colors.textAccent : colors.textSecondary}>
            {i === cursor ? '▸ ' : '  '}
          </Text>
          {renderItem(item, i, i === cursor)}
        </Box>
      ))}
    </Box>
  );
}
