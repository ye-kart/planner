import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  children: ReactNode;
  width?: number | string;
  height?: number | string;
}

export function Panel({ title, children, width, height }: PanelProps) {
  const { colors } = useTheme();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.border}
      paddingX={1}
      width={width as number | undefined}
      height={height as number | undefined}
    >
      {title && (
        <Box marginBottom={0}>
          <Text color={colors.textAccent} bold>{title}</Text>
        </Box>
      )}
      {children}
    </Box>
  );
}
