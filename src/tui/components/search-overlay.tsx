import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';
import { useTheme } from '../hooks/use-theme.js';

interface SearchOverlayProps {
  onSubmit: (query: string) => void;
  onCancel: () => void;
}

export function SearchOverlay({ onSubmit, onCancel }: SearchOverlayProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  return (
    <Box borderStyle="round" borderColor={colors.borderActive} paddingX={1}>
      <Text color={colors.textAccent} bold>🔍 </Text>
      <TextInput
        value={query}
        onChange={setQuery}
        onSubmit={(val) => {
          if (val.trim()) {
            onSubmit(val.trim());
          } else {
            onCancel();
          }
        }}
      />
      <Text color={colors.textSecondary}> (Esc to cancel)</Text>
    </Box>
  );
}
