import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { TopBar } from './top-bar.js';
import { SearchOverlay } from './search-overlay.js';
import { Screen } from '../types.js';
import { useRefresh } from '../hooks/use-refresh.js';
import { useTheme } from '../hooks/use-theme.js';
import { DashboardScreen } from '../screens/dashboard.js';
import { AreasScreen } from '../screens/areas.js';
import { GoalsScreen } from '../screens/goals.js';
import { TasksScreen } from '../screens/tasks.js';
import { HabitsScreen } from '../screens/habits.js';

interface LayoutProps {
  screen: Screen;
  searchActive: boolean;
  onSearchClose: () => void;
  setInputActive: (active: boolean) => void;
}

export function Layout({ screen, searchActive, onSearchClose, setInputActive }: LayoutProps) {
  const { colors } = useTheme();
  const [refreshKey, refresh] = useRefresh();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = useCallback((query: string) => {
    setSearchQuery(query);
    onSearchClose();
  }, [onSearchClose]);

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    onSearchClose();
  }, [onSearchClose]);

  // Allow Escape to clear search when not in search overlay
  useInput((_input, key) => {
    if (!searchActive && key.escape && searchQuery) {
      setSearchQuery('');
    }
  });

  const screenProps = { refreshKey, refresh, searchQuery, setInputActive };

  return (
    <Box flexDirection="column">
      <TopBar screen={screen} />

      {searchActive && (
        <SearchOverlay
          onSubmit={handleSearchSubmit}
          onCancel={handleSearchCancel}
        />
      )}

      {searchQuery && !searchActive && (
        <Box paddingX={1}>
          <Text color={colors.warning}>
            {'🔍 Filtering: "' + searchQuery + '" (Esc to clear)'}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" paddingX={1} minHeight={10}>
        {screen === Screen.Dashboard && <DashboardScreen refreshKey={refreshKey} searchQuery={searchQuery} />}
        {screen === Screen.Areas && <AreasScreen {...screenProps} />}
        {screen === Screen.Goals && <GoalsScreen {...screenProps} />}
        {screen === Screen.Tasks && <TasksScreen {...screenProps} />}
        {screen === Screen.Habits && <HabitsScreen {...screenProps} />}
      </Box>
    </Box>
  );
}
