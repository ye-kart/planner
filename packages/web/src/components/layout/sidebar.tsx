import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../stores/theme.store';

const screens = [
  { key: '1', path: '/', label: 'Dashboard', icon: '~' },
  { key: '2', path: '/areas', label: 'Areas', icon: '#' },
  { key: '3', path: '/goals', label: 'Goals', icon: '*' },
  { key: '4', path: '/tasks', label: 'Tasks', icon: '>' },
  { key: '5', path: '/habits', label: 'Habits', icon: '+' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { themeName, cycleTheme } = useThemeStore();

  return (
    <aside className="w-48 shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h1 className="text-lg font-bold text-[var(--color-text-accent)]">Planner</h1>
      </div>

      <nav className="flex-1 py-2">
        {screens.map((s) => {
          const active = location.pathname === s.path;
          return (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className={`w-full text-left px-4 py-2 flex items-center gap-3 text-sm transition-colors ${
                active
                  ? 'bg-[var(--color-bg-highlight)] text-[var(--color-tab-active)] border-r-2 border-[var(--color-tab-active)]'
                  : 'text-[var(--color-tab-inactive)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)]'
              }`}
            >
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">{s.key}</span>
              <span className="font-mono">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--color-border)]">
        <button
          onClick={cycleTheme}
          className="w-full text-left text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] transition-colors"
        >
          <span className="font-mono mr-2">t</span>
          Theme: {themeName}
        </button>
      </div>
    </aside>
  );
}
