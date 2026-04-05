import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../stores/theme.store';
import { useCurrentSpace } from '../../contexts/space-context';
import { useSpaces } from '../../hooks/use-api';

const screens = [
  { key: '1', path: '', label: 'Dashboard', icon: '~' },
  { key: '2', path: '/areas', label: 'Areas', icon: '#' },
  { key: '3', path: '/goals', label: 'Goals', icon: '*' },
  { key: '4', path: '/tasks', label: 'Tasks', icon: '>' },
  { key: '5', path: '/habits', label: 'Habits', icon: '+' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { themeName, cycleTheme } = useThemeStore();
  const { spaceId } = useCurrentSpace();
  const { data: spaces } = useSpaces();
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);

  const currentSpace = spaces?.find(s => s.id === spaceId);
  const basePath = `/spaces/${spaceId}`;

  return (
    <aside className="w-48 shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      {/* Space Switcher */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <button
          onClick={() => setSpaceSwitcherOpen(!spaceSwitcherOpen)}
          className="w-full text-left flex items-center gap-2 hover:text-[var(--color-text-accent)] transition-colors"
        >
          <span className="text-lg">{currentSpace?.icon ?? '📁'}</span>
          <span className="text-lg font-bold text-[var(--color-text-accent)] truncate flex-1">
            {currentSpace?.name ?? 'Planner'}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">{spaceSwitcherOpen ? '▲' : '▼'}</span>
        </button>

        {spaceSwitcherOpen && spaces && (
          <div className="mt-2 space-y-1">
            {spaces.map((space) => (
              <button
                key={space.id}
                onClick={() => {
                  navigate(`/spaces/${space.id}`);
                  setSpaceSwitcherOpen(false);
                }}
                className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 transition-colors ${
                  space.id === spaceId
                    ? 'bg-[var(--color-bg-highlight)] text-[var(--color-tab-active)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-highlight)]'
                }`}
              >
                <span>{space.icon ?? '📁'}</span>
                <span className="truncate">{space.name}</span>
              </button>
            ))}
            <button
              onClick={() => {
                navigate('/spaces/manage');
                setSpaceSwitcherOpen(false);
              }}
              className="w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 mt-1 border-t border-[var(--color-border)] pt-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
            >
              <span>⚙</span>
              <span>Manage Spaces</span>
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 py-2">
        {screens.map((s) => {
          const fullPath = basePath + s.path;
          const active = s.path === ''
            ? location.pathname === basePath || location.pathname === basePath + '/'
            : location.pathname.startsWith(fullPath);
          return (
            <button
              key={s.path}
              onClick={() => navigate(fullPath)}
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
