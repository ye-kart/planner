import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/app-layout';
import { SpaceProvider } from './contexts/space-context';
import { SpaceRedirect } from './components/layout/space-redirect';
import { DashboardPage } from './pages/dashboard';
import { AreasPage } from './pages/areas';
import { GoalsPage } from './pages/goals';
import { TasksPage } from './pages/tasks';
import { HabitsPage } from './pages/habits';
import { LoginPage } from './pages/login';
import { SpacesPage } from './pages/spaces';
import { AdminPage } from './pages/admin';
import { SubscribePage } from './pages/subscribe';
import { IntegrationsPage } from './pages/integrations';
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
          <Route path="/spaces/manage" element={<SpacesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/subscribe" element={<SubscribePage />} />
          <Route path="/" element={<SpaceRedirect />} />
          <Route path="/spaces/:spaceId" element={<SpaceProvider><KeyboardProvider><AppLayout /></KeyboardProvider></SpaceProvider>}>
            <Route index element={<DashboardPage />} />
            <Route path="areas" element={<AreasPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="habits" element={<HabitsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
          </Route>
          {/* Catch-all redirect for old routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
