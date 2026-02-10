export enum Screen {
  Dashboard = 'dashboard',
  Areas = 'areas',
  Goals = 'goals',
  Tasks = 'tasks',
  Habits = 'habits',
}

export const SCREEN_ORDER: Screen[] = [
  Screen.Dashboard,
  Screen.Areas,
  Screen.Goals,
  Screen.Tasks,
  Screen.Habits,
];

export const SCREEN_KEYS: Record<string, Screen> = {
  '1': Screen.Dashboard,
  '2': Screen.Areas,
  '3': Screen.Goals,
  '4': Screen.Tasks,
  '5': Screen.Habits,
};

export const SCREEN_LABELS: Record<Screen, string> = {
  [Screen.Dashboard]: 'Dashboard',
  [Screen.Areas]: 'Areas',
  [Screen.Goals]: 'Goals',
  [Screen.Tasks]: 'Tasks',
  [Screen.Habits]: 'Habits',
};
