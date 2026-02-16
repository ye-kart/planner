import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/app-layout';
import { DashboardPage } from './pages/dashboard';
import { AreasPage } from './pages/areas';
import { GoalsPage } from './pages/goals';
import { TasksPage } from './pages/tasks';
import { HabitsPage } from './pages/habits';
import { LoginPage } from './pages/login';
import { useKeyboard } from './hooks/use-keyboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function KeyboardProvider({ children }: { children: React.ReactNode }) {
  useKeyboard();
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<KeyboardProvider><AppLayout /></KeyboardProvider>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/areas" element={<AreasPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/habits" element={<HabitsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
