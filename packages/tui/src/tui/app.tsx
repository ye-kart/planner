import { useState, useCallback, useMemo } from 'react';
import { render, Box, useApp } from 'ink';
import { ThemeContext, themes, themeNames } from './themes/index.js';
import type { Theme } from './themes/index.js';
import { ServicesContext, type Container } from './hooks/use-services.js';
import { useScreen } from './hooks/use-screen.js';
import { useGlobalKeys } from './hooks/use-global-keys.js';
import { Layout } from './components/layout.js';
import { Screen } from './types.js';
import { createCoreContainer, getDb, SpaceRepository, ConfigService } from '@planner/core';
import { ChatService } from '@planner/ai';
import type { Space } from '@planner/core';

interface AppProps {
  container: Container;
  initialTheme: string;
  initialSpaceId: string;
  db: ReturnType<typeof getDb>;
}

function App({ container: initialContainer, initialTheme, initialSpaceId, db }: AppProps) {
  const [themeName, setThemeName] = useState<string>(
    themeNames.includes(initialTheme) ? initialTheme : 'neon'
  );
  const [searchActive, setSearchActive] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [spacePickerOpen, setSpacePickerOpen] = useState(false);
  const [currentSpaceId, setCurrentSpaceId] = useState(initialSpaceId);
  const [container, setContainer] = useState<Container>(initialContainer);
  const theme: Theme = themes[themeName]!;

  // Get all spaces (unscoped query)
  const spaceRepo = useMemo(() => new SpaceRepository(db), [db]);
  const spaces: Space[] = useMemo(() => spaceRepo.findAll(), [spaceRepo, currentSpaceId]);
  const currentSpace = spaces.find(s => s.id === currentSpaceId);

  const cycleTheme = useCallback(() => {
    setThemeName(prev => {
      const idx = themeNames.indexOf(prev);
      return themeNames[(idx + 1) % themeNames.length]!;
    });
  }, []);

  const { screen, goTo, next, prev } = useScreen(Screen.Dashboard);

  const { exit } = useApp();
  const onQuit = useCallback(() => exit(), [exit]);

  const openChat = useCallback(() => {
    setChatOpen(true);
  }, []);

  const handleSpaceSelect = useCallback((spaceId: string) => {
    setSpacePickerOpen(false);
    if (spaceId === currentSpaceId) return;

    // Rebuild container with new spaceId
    const core = createCoreContainer(db, spaceId);
    const chatService = new ChatService(
      core.conversationRepo, core.messageRepo, core.configService,
      core.areaService, core.goalService, core.taskService, core.habitService, core.contextService,
    );
    const newContainer: Container = { ...core, chatService };

    // Persist the selection
    const configService = new ConfigService();
    configService.setCurrentSpaceId(spaceId);

    setCurrentSpaceId(spaceId);
    setContainer(newContainer);
  }, [currentSpaceId, db]);

  useGlobalKeys({
    onQuit,
    cycleTheme,
    goToScreen: goTo,
    nextScreen: next,
    prevScreen: prev,
    openSearch: () => setSearchActive(true),
    openChat,
    openSpacePicker: () => setSpacePickerOpen(true),
    searchActive,
    inputActive,
    chatOpen,
    spacePickerOpen,
  });

  return (
    <ThemeContext.Provider value={{ theme, themeName, colors: theme.colors, cycleTheme }}>
      <ServicesContext.Provider value={container}>
        <Box flexDirection="column">
          <Layout
            screen={screen}
            searchActive={searchActive}
            onSearchClose={() => setSearchActive(false)}
            setInputActive={setInputActive}
            chatOpen={chatOpen}
            onChatClose={() => setChatOpen(false)}
            chatService={container.chatService}
            chatConfigured={container.configService.isChatConfigured()}
            spaceName={currentSpace?.name}
            spaceIcon={currentSpace?.icon}
            spaces={spaces}
            currentSpaceId={currentSpaceId}
            spacePickerOpen={spacePickerOpen}
            onSpaceSelect={handleSpaceSelect}
            onSpacePickerClose={() => setSpacePickerOpen(false)}
          />
        </Box>
      </ServicesContext.Provider>
    </ThemeContext.Provider>
  );
}

export function renderApp(container: Container, themeName: string): void {
  // Get the current spaceId and db for space switching
  const db = getDb();
  const configService = new ConfigService();
  const spaceRepo = new SpaceRepository(db);
  const savedId = configService.getCurrentSpaceId();
  const spaces = spaceRepo.findAll();
  const currentSpaceId = (savedId && spaces.find(s => s.id === savedId))
    ? savedId
    : spaces[0]?.id ?? '';

  const instance = render(
    <App container={container} initialTheme={themeName} initialSpaceId={currentSpaceId} db={db} />
  );
  instance.waitUntilExit().then(() => {
    process.exit(0);
  });
}
