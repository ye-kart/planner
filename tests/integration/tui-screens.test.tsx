import { render } from 'ink-testing-library';
import { ThemeContext, themes } from '../../src/tui/themes/index.js';
import { ServicesContext } from '../../src/tui/hooks/use-services.js';
import { createTestContainer } from '../../src/container.js';
import { createTestDb } from './helpers/db.js';
import { DashboardScreen } from '../../src/tui/screens/dashboard.js';
import { AreasScreen } from '../../src/tui/screens/areas.js';
import { GoalsScreen } from '../../src/tui/screens/goals.js';
import { TasksScreen } from '../../src/tui/screens/tasks.js';
import { HabitsScreen } from '../../src/tui/screens/habits.js';
import { TopBar } from '../../src/tui/components/top-bar.js';
import { BottomBar } from '../../src/tui/components/bottom-bar.js';
import { Screen } from '../../src/tui/types.js';
import React from 'react';

const neon = themes['neon']!;
const themeValue = {
  theme: neon,
  themeName: 'neon',
  colors: neon.colors,
  cycleTheme: () => {},
};

const noop = () => {};

function createWrapper() {
  const db = createTestDb();
  const container = createTestContainer(db);
  // Seed some data
  container.areaService.add('Work', 'Work area');
  container.areaService.add('Health');
  const goal = container.goalService.add('Learn TypeScript', { priority: 'high' });
  container.taskService.add('Write tests', { priority: 'medium' });
  container.habitService.add('Exercise', { frequency: 'daily' });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeContext.Provider value={themeValue}>
        <ServicesContext.Provider value={container}>
          {children}
        </ServicesContext.Provider>
      </ThemeContext.Provider>
    );
  }

  return { Wrapper, container };
}

describe('TUI Screens', () => {
  describe('TopBar', () => {
    it('renders screen name and planner title', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <TopBar screen={Screen.Dashboard} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('PLANNER');
      expect(frame).toContain('Dashboard');
      expect(frame).toContain('neon');
    });
  });

  describe('BottomBar', () => {
    it('renders tab strip with all screens', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <BottomBar screen={Screen.Dashboard} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('[1]Dashboard');
      expect(frame).toContain('[2]Areas');
      expect(frame).toContain('[3]Goals');
      expect(frame).toContain('[4]Tasks');
      expect(frame).toContain('[5]Habits');
      expect(frame).toContain('q:quit');
    });
  });

  describe('DashboardScreen', () => {
    it('renders summary with data', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <DashboardScreen refreshKey={0} searchQuery="" />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Summary');
      expect(frame).toContain('Tasks due');
      expect(frame).toContain('Habits');
    });

    it('shows habits due today', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <DashboardScreen refreshKey={0} searchQuery="" />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Exercise');
    });
  });

  describe('AreasScreen', () => {
    it('renders area list', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <AreasScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Areas');
      expect(frame).toContain('Work');
      expect(frame).toContain('Health');
    });

    it('filters by search query', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <AreasScreen refreshKey={0} refresh={noop} searchQuery="work" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Work');
      expect(frame).not.toContain('Health');
    });

    it('shows CRUD hints', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <AreasScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('detail');
      expect(frame).toContain('add');
      expect(frame).toContain('edit');
      expect(frame).toContain('delete');
    });
  });

  describe('GoalsScreen', () => {
    it('renders goal list', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <GoalsScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Goals');
      expect(frame).toContain('Learn TypeScript');
    });

    it('shows CRUD and filter hints', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <GoalsScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('detail');
      expect(frame).toContain('add');
      expect(frame).toContain('edit');
      expect(frame).toContain('delete');
      expect(frame).toContain('filter');
    });
  });

  describe('TasksScreen', () => {
    it('renders task list', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <TasksScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Tasks');
      expect(frame).toContain('Write tests');
    });

    it('shows CRUD and action hints', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <TasksScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('detail');
      expect(frame).toContain('add');
      expect(frame).toContain('edit');
      expect(frame).toContain('delete');
      expect(frame).toContain('done');
      expect(frame).toContain('start');
      expect(frame).toContain('filter');
    });
  });

  describe('HabitsScreen', () => {
    it('renders habits due today', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <HabitsScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('Habits');
      expect(frame).toContain('Exercise');
    });

    it('shows contextual key hints', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <HabitsScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('toggle');
      expect(frame).toContain('edit');
      expect(frame).toContain('archive');
      expect(frame).toContain('add');
      expect(frame).toContain('delete');
    });

    it('shows edit hint for habit actions', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <HabitsScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      // Edit and archive hints are shown in the list view
      expect(frame).toContain('e');
      expect(frame).toContain('edit');
      expect(frame).toContain('a');
      expect(frame).toContain('archive');
      expect(frame).toContain('toggle');
    });

    it('shows view toggle hint', () => {
      const { Wrapper } = createWrapper();
      const { lastFrame } = render(
        <Wrapper>
          <HabitsScreen refreshKey={0} refresh={noop} searchQuery="" setInputActive={noop} />
        </Wrapper>
      );
      const frame = lastFrame()!;
      expect(frame).toContain('v');
      expect(frame).toContain('all');
    });
  });
});
