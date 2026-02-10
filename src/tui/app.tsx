import { useState, useCallback } from 'react';
import { render, Box } from 'ink';
import { ThemeContext, themes, themeNames } from './themes/index.js';
import type { Theme } from './themes/index.js';
import { ServicesContext, type Container } from './hooks/use-services.js';
import { useScreen } from './hooks/use-screen.js';
import { useGlobalKeys } from './hooks/use-global-keys.js';
import { Layout } from './components/layout.js';
import { Screen } from './types.js';

interface AppProps {
  container: Container;
  initialTheme: string;
}

function App({ container, initialTheme }: AppProps) {
  const [themeName, setThemeName] = useState<string>(
    themeNames.includes(initialTheme) ? initialTheme : 'neon'
  );
  const [searchActive, setSearchActive] = useState(false);
  const theme: Theme = themes[themeName]!;

  const cycleTheme = useCallback(() => {
    setThemeName(prev => {
      const idx = themeNames.indexOf(prev);
      return themeNames[(idx + 1) % themeNames.length]!;
    });
  }, []);

  const { screen, goTo, next, prev } = useScreen(Screen.Dashboard);

  const [exiting, setExiting] = useState(false);
  const onQuit = useCallback(() => setExiting(true), []);

  useGlobalKeys({
    onQuit,
    cycleTheme,
    goToScreen: goTo,
    nextScreen: next,
    prevScreen: prev,
    openSearch: () => setSearchActive(true),
    searchActive,
  });

  if (exiting) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeName, colors: theme.colors, cycleTheme }}>
      <ServicesContext.Provider value={container}>
        <Box flexDirection="column">
          <Layout
            screen={screen}
            searchActive={searchActive}
            onSearchClose={() => setSearchActive(false)}
          />
        </Box>
      </ServicesContext.Provider>
    </ThemeContext.Provider>
  );
}

export function renderApp(container: Container, themeName: string): void {
  const instance = render(
    <App container={container} initialTheme={themeName} />
  );
  instance.waitUntilExit().then(() => {
    process.exit(0);
  });
}
