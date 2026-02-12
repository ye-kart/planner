import { useState, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { TopBar } from './top-bar.js';
import { SearchOverlay } from './search-overlay.js';
import { ChatPanel } from './chat-panel.js';
import { Screen } from '../types.js';
import { useRefresh } from '../hooks/use-refresh.js';
import { useTheme } from '../hooks/use-theme.js';
import { DashboardScreen } from '../screens/dashboard.js';
import { AreasScreen } from '../screens/areas.js';
import { GoalsScreen } from '../screens/goals.js';
import { TasksScreen } from '../screens/tasks.js';
import { HabitsScreen } from '../screens/habits.js';
import type { ChatService } from '../../services/chat.service.js';

interface LayoutProps {
  screen: Screen;
  searchActive: boolean;
  onSearchClose: () => void;
  setInputActive: (active: boolean) => void;
  chatOpen: boolean;
  onChatClose: () => void;
  chatService: ChatService;
  chatConfigured: boolean;
}

export function Layout({ screen, searchActive, onSearchClose, setInputActive, chatOpen, onChatClose, chatService, chatConfigured }: LayoutProps) {
  const { colors } = useTheme();
  const [refreshKey, refresh] = useRefresh();
  const [searchQuery, setSearchQuery] = useState('');
  const { stdout } = useStdout();

  const handleSearchSubmit = useCallback((query: string) => {
    setSearchQuery(query);
    onSearchClose();
  }, [onSearchClose]);

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    onSearchClose();
  }, [onSearchClose]);

  const handleChatClose = useCallback(() => {
    onChatClose();
    refresh(); // Pick up any AI-made changes
  }, [onChatClose, refresh]);

  // Allow Escape to clear search when not in search overlay
  useInput((_input, key) => {
    if (!searchActive && !chatOpen && key.escape && searchQuery) {
      setSearchQuery('');
    }
  });

  const screenProps = { refreshKey, refresh, searchQuery, setInputActive };

  // Calculate chat panel height (~40% of terminal, min 8, max 20)
  const termHeight = stdout?.rows || 24;
  const chatHeight = chatOpen ? Math.min(Math.max(Math.round(termHeight * 0.4), 8), 20) : 0;
  const mainHeight = chatOpen ? termHeight - chatHeight - 3 : undefined;

  return (
    <Box flexDirection="column">
      <TopBar screen={screen} chatConfigured={chatConfigured} />

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

      <Box flexDirection="column" paddingX={1} minHeight={chatOpen ? undefined : 10} height={mainHeight}>
        {screen === Screen.Dashboard && <DashboardScreen refreshKey={refreshKey} searchQuery={searchQuery} />}
        {screen === Screen.Areas && <AreasScreen {...screenProps} />}
        {screen === Screen.Goals && <GoalsScreen {...screenProps} />}
        {screen === Screen.Tasks && <TasksScreen {...screenProps} />}
        {screen === Screen.Habits && <HabitsScreen {...screenProps} />}
      </Box>

      {chatOpen && (
        <ChatPanel
          screen={screen}
          chatService={chatService}
          onClose={handleChatClose}
          setInputActive={setInputActive}
          panelHeight={chatHeight}
        />
      )}
    </Box>
  );
}
