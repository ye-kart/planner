import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllowedUsers, addAllowedUser, removeAllowedUser, type AllowedUser } from '../api/admin.api';
import { useAuthMe } from '../hooks/use-api';
import { ApiError } from '../api/client';

export function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Gate the route: redirect anyone who isn't a confirmed admin (the sidebar
  // only hides the link; the route itself was previously reachable directly).
  const { data: authMe, isLoading: authLoading } = useAuthMe();
  useEffect(() => {
    if (!authLoading && authMe && !authMe.isAdmin) {
      navigate('/', { replace: true });
    }
  }, [authLoading, authMe, navigate]);

  const { data: users, isLoading, isError: usersError, error: usersErrorObj } = useQuery({
    queryKey: ['admin', 'allowed-users'],
    queryFn: fetchAllowedUsers,
    enabled: authMe?.isAdmin === true,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: (data: { provider: string; username: string }) => addAllowedUser(data.provider, data.username),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-users'] }),
  });

  const removeMutation = useMutation({
    mutationFn: removeAllowedUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-users'] }),
  });

  const [provider, setProvider] = useState<'github' | 'google'>('github');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!username.trim()) return;
    setError('');
    addMutation.mutate({ provider, username: username.trim() }, {
      onSuccess: () => setUsername(''),
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to add user'),
    });
  };

  const handleRemove = (user: AllowedUser) => {
    if (user.isAdmin) return;
    removeMutation.mutate(user.id);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Admin Panel</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] transition-colors"
          >
            Back
          </button>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text-accent)] mb-4">Allowed Users</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Only users in this list can log in. If the list is empty, anyone can log in.
          </p>

          {/* Add user form */}
          <div className="flex gap-2 mb-4">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'github' | 'google')}
              className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] text-sm"
            >
              <option value="github">GitHub</option>
              <option value="google">Google</option>
            </select>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={provider === 'github' ? 'GitHub username' : 'Email address'}
              className="flex-1 px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-secondary)]"
            />
            <button
              onClick={handleAdd}
              disabled={addMutation.isPending || !username.trim()}
              className="px-4 py-2 rounded bg-[var(--color-tab-active)] text-[var(--color-bg)] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          {/* User list */}
          {usersError ? (
            <p className="text-sm text-red-400">
              {usersErrorObj instanceof ApiError && usersErrorObj.status === 403
                ? 'You do not have admin access.'
                : 'Failed to load allowed users.'}
            </p>
          ) : isLoading ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading...</p>
          ) : (
            <div className="space-y-1">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 rounded bg-[var(--color-bg-panel)] border border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-bg-highlight)] text-[var(--color-text-secondary)] font-mono">
                      {user.provider}
                    </span>
                    <span className="text-sm font-medium">{user.username}</span>
                    {user.isAdmin && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-tab-active)] text-[var(--color-bg)] font-medium">
                        admin
                      </span>
                    )}
                  </div>
                  {!user.isAdmin && (
                    <button
                      onClick={() => handleRemove(user)}
                      disabled={removeMutation.isPending}
                      className="text-xs text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {users?.length === 0 && (
                <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                  No users in allowlist. Anyone with a configured OAuth provider can log in.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
