import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  useCreateMcpToken,
  useMcpTokens,
  useRevokeMcpToken,
} from '../hooks/use-api';
import { useCurrentSpace } from '../contexts/space-context';
import { useKeyboardStore } from '../stores/keyboard.store';
import { ApiError } from '../api/client';
import { ConfirmDialog } from '../components/shared/confirm-dialog';
import type {
  McpTokenCreateResponse,
  McpTokenScope,
  McpTokenSummary,
} from '../api/types';

const EXPIRY_OPTIONS = [7, 30, 90] as const;

const scopeOptions: Array<{
  value: McpTokenScope;
  label: string;
  description: string;
}> = [
  {
    value: 'planner:read',
    label: 'Read',
    description: 'View plans and progress in this space.',
  },
  {
    value: 'planner:write',
    label: 'Write',
    description: 'Create and update items. Permanent deletion is not exposed.',
  },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function tokenStatus(token: McpTokenSummary): 'active' | 'expired' | 'revoked' {
  if (token.revokedAt) return 'revoked';
  if (new Date(token.expiresAt).getTime() <= Date.now()) return 'expired';
  return 'active';
}

async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard access is unavailable in this browser.');
  }
  await navigator.clipboard.writeText(value);
}

export function IntegrationsPage() {
  const { spaceId } = useCurrentSpace();
  const currentSpaceId = useRef(spaceId);
  const nameId = useId();
  const setInputFocused = useKeyboardStore((state) => state.setInputFocused);
  const tokensQuery = useMcpTokens();
  const createToken = useCreateMcpToken();
  const revokeToken = useRevokeMcpToken();

  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<McpTokenScope[]>(['planner:read']);
  const [expiresInDays, setExpiresInDays] = useState<(typeof EXPIRY_OPTIONS)[number]>(30);
  const [createdCredential, setCreatedCredential] = useState<McpTokenCreateResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<McpTokenSummary | null>(null);
  const [formError, setFormError] = useState('');
  const [revokeError, setRevokeError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'token' | 'url' | 'error'>('idle');

  useEffect(() => {
    currentSpaceId.current = spaceId;
    setName('');
    setScopes(['planner:read']);
    setExpiresInDays(30);
    setCreatedCredential(null);
    setRevokeTarget(null);
    setCopyState('idle');
    setFormError('');
    setRevokeError('');
  }, [spaceId]);

  useEffect(() => () => setInputFocused(false), [setInputFocused]);

  const resourceUrl = createdCredential?.resourceUrl ?? tokensQuery.data?.resourceUrl;

  const toggleScope = (scope: McpTokenScope) => {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Name this connection so you can recognize it later.');
      return;
    }
    if (scopes.length === 0) {
      setFormError('Choose at least one permission.');
      return;
    }

    createToken.mutate(
      { name: trimmedName, scopes, expiresInDays },
      {
        onSuccess: (response) => {
          if (response.grant.spaceId !== currentSpaceId.current) return;
          setCreatedCredential(response);
          setName('');
          setScopes(['planner:read']);
          setExpiresInDays(30);
          setCopyState('idle');
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiError
              ? error.message
              : 'Planner could not create this connection. Try again.',
          );
        },
      },
    );
  };

  const handleCopy = async (kind: 'token' | 'url', value: string) => {
    try {
      await copyText(value);
      setCopyState(kind);
    } catch {
      setCopyState('error');
    }
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    const tokenId = revokeTarget.id;
    setRevokeError('');
    setRevokeTarget(null);
    revokeToken.mutate(tokenId, {
      onError: (error) => {
        setRevokeError(
          error instanceof ApiError
            ? error.message
            : 'Planner could not revoke this connection. Try again.',
        );
      },
    });
  };

  return (
    <div className="max-w-5xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent-1)]" aria-hidden="true" />
          Space-bound credentials
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Agent access</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
          Create a private connection for an MCP agent. Every token works with this space only,
          and its secret cannot be recovered after you leave this page.
        </p>
      </header>

      {createdCredential && (
        <section
          aria-labelledby="new-token-title"
          className="overflow-hidden rounded-lg border border-[var(--color-success)] bg-[var(--color-bg-panel)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <h2 id="new-token-title" className="text-sm font-semibold text-[var(--color-success)]">
                Connection created
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Copy the token now. Planner will not show this secret again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreatedCredential(null)}
              className="shrink-0 rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-highlight)] hover:text-[var(--color-text-primary)]"
              aria-label="Dismiss new token"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-md bg-[var(--color-bg)] px-3 py-2.5 text-xs leading-5 text-[var(--color-text-primary)]">
                {createdCredential.token}
              </code>
              <button
                type="button"
                onClick={() => handleCopy('token', createdCredential.token)}
                className="shrink-0 rounded-md bg-[var(--color-success)] px-4 py-2.5 text-sm font-medium text-[var(--color-bg)] hover:opacity-90 active:opacity-80"
              >
                {copyState === 'token' ? 'Copied' : 'Copy token'}
              </button>
            </div>
            <p aria-live="polite" className="text-xs text-[var(--color-text-secondary)]">
              {copyState === 'error'
                ? 'Clipboard access failed. Select the token and copy it manually.'
                : 'Store it in your agent’s secret or environment settings.'}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <section
          aria-labelledby="create-connection-title"
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)]"
        >
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h2 id="create-connection-title" className="text-sm font-semibold text-[var(--color-text-accent)]">
              New connection
            </h2>
          </div>
          <form
            onSubmit={handleCreate}
            onFocus={() => setInputFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setInputFocused(false);
              }
            }}
            className="space-y-5 p-4"
          >
            <div>
              <label htmlFor={nameId} className="mb-1.5 block text-xs text-[var(--color-text-secondary)]">
                Connection name
              </label>
              <input
                id={nameId}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                maxLength={80}
                placeholder="e.g. Weekly planning agent"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-border-active)] focus:outline-none"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs text-[var(--color-text-secondary)]">Permissions</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {scopeOptions.map((option) => {
                  const checked = scopes.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                        checked
                          ? 'border-[var(--color-border-active)] bg-[var(--color-bg-highlight)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-active)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleScope(option.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent-1)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs text-[var(--color-text-secondary)]">Expires after</legend>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
                {EXPIRY_OPTIONS.map((days) => (
                  <label key={days} className="cursor-pointer">
                    <input
                      type="radio"
                      name="expiry"
                      value={days}
                      checked={expiresInDays === days}
                      onChange={() => setExpiresInDays(days)}
                      className="peer sr-only"
                    />
                    <span className="block rounded-md px-2 py-2 text-center text-xs text-[var(--color-tab-inactive)] transition-colors peer-checked:bg-[var(--color-tab-active)] peer-checked:font-medium peer-checked:text-[var(--color-bg)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-border-active)]">
                      {days} days
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {formError && (
              <p role="alert" className="text-xs text-[var(--color-error)]">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={createToken.isPending}
              className="w-full rounded-lg bg-[var(--color-accent-1)] px-4 py-2.5 text-sm font-medium text-[var(--color-bg)] hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createToken.isPending ? 'Creating…' : 'Create connection'}
            </button>
          </form>
        </section>

        <aside className="h-fit rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-accent)]">Connection details</h2>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">MCP resource URL</p>
              {tokensQuery.isLoading ? (
                <div className="mt-2 h-9 animate-pulse rounded-md bg-[var(--color-bg-highlight)]" />
              ) : resourceUrl ? (
                <div className="mt-2 flex min-w-0 gap-2">
                  <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-md bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-primary)]">
                    {resourceUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy('url', resourceUrl)}
                    className="shrink-0 rounded-md border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)] hover:text-[var(--color-text-accent)]"
                  >
                    {copyState === 'url' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--color-error)]">Resource URL unavailable.</p>
              )}
            </div>
            <div className="border-t border-[var(--color-border)] pt-4 text-xs leading-5 text-[var(--color-text-secondary)]">
              <p>
                Give the agent the resource URL and token. The token cannot reach your other
                Planner spaces.
              </p>
              <p className="mt-2">
                Revoke a connection when an agent no longer needs access.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <section aria-labelledby="connections-title" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="connections-title" className="text-lg font-semibold text-[var(--color-text-accent)]">
              Connections for this space
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Secrets are never displayed in this list.
            </p>
          </div>
          {tokensQuery.data && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {tokensQuery.data.tokens.length} {tokensQuery.data.tokens.length === 1 ? 'connection' : 'connections'}
            </span>
          )}
        </div>

        {revokeError && (
          <p role="alert" className="text-xs text-[var(--color-error)]">
            {revokeError}
          </p>
        )}

        {tokensQuery.isLoading ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 text-sm text-[var(--color-text-secondary)]">
            Loading connections…
          </div>
        ) : tokensQuery.isError ? (
          <div className="rounded-lg border border-[var(--color-error)] bg-[var(--color-bg-panel)] p-4">
            <p className="text-sm text-[var(--color-error)]">Planner could not load agent connections.</p>
            <button
              type="button"
              onClick={() => tokensQuery.refetch()}
              className="mt-3 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)] hover:text-[var(--color-text-accent)]"
            >
              Try again
            </button>
          </div>
        ) : tokensQuery.data?.tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] px-4 py-10 text-center">
            <p className="text-sm text-[var(--color-text-primary)]">No agent connections yet</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Create one above when an agent needs access to this space.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tokensQuery.data?.tokens.map((token) => {
              const status = tokenStatus(token);
              const isRevoking = revokeToken.isPending && revokeToken.variables === token.id;
              return (
                <article
                  key={token.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-semibold text-[var(--color-text-primary)]">
                          {token.name}
                        </h3>
                        <span
                          className={`rounded px-2 py-0.5 text-[0.68rem] font-medium uppercase tracking-wide ${
                            status === 'active'
                              ? 'bg-[var(--color-bg-highlight)] text-[var(--color-success)]'
                              : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {token.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]"
                          >
                            {scope === 'planner:read' ? 'Read' : 'Write'}
                          </span>
                        ))}
                      </div>
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-[var(--color-text-secondary)] sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt>Expires</dt>
                          <dd className="text-[var(--color-text-primary)]">{formatDate(token.expiresAt)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt>Last used</dt>
                          <dd className="text-[var(--color-text-primary)]">
                            {token.lastUsedAt ? formatDate(token.lastUsedAt) : 'Never'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    {status === 'active' && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(token)}
                        disabled={isRevoking}
                        className="shrink-0 self-start rounded border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRevoking ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke agent connection"
        message={revokeTarget
          ? `Revoke “${revokeTarget.name}”? Its token will stop working immediately.`
          : ''}
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
