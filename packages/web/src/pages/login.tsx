import { FormEvent, useEffect, useMemo, useState } from 'react';

type Mode = 'login' | 'register' | 'reset';

export function LoginPage() {
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const resetToken = useMemo(() => new URLSearchParams(window.location.search).get('resetToken'), []);

  useEffect(() => {
    fetch('/api/auth/providers').then((r) => r.json()).then((data: { providers: string[] }) => setProviders(data.providers)).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const path = resetToken ? '/api/auth/password-reset/confirm' : mode === 'register' ? '/api/auth/register' : mode === 'reset' ? '/api/auth/password-reset' : '/api/auth/login';
    const body = resetToken ? { token: resetToken, password } : mode === 'reset' ? { email } : { email, password };
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setMessage(data.error ?? 'Something went wrong');
    if (resetToken) { window.location.href = '/login'; return; }
    if (mode === 'login') { window.location.href = '/'; return; }
    setMessage(mode === 'register' ? 'Check your inbox to verify your email address.' : 'If an account exists, a reset link is on its way.');
  }

  const passwordEnabled = providers.includes('password');
  const title = resetToken ? 'Choose a new password' : mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to manage your life plan';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="text-center space-y-6 w-full max-w-sm">
        <h1 className="text-4xl font-bold text-[var(--color-text-accent)]">Planner</h1>
        <p className="text-[var(--color-text-secondary)]">{title}</p>
        {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading...</p> : providers.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No auth providers configured</p> : <>
          {passwordEnabled && <form onSubmit={submit} className="flex flex-col gap-3 text-left">
            {!resetToken && <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-highlight)] px-4 py-3 text-[var(--color-text-primary)]" />}
            {mode !== 'reset' && <input type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-highlight)] px-4 py-3 text-[var(--color-text-primary)]" />}
            <button className="rounded bg-[var(--color-accent-1)] px-6 py-3 font-medium text-[var(--color-bg)] hover:opacity-90">{resetToken ? 'Update password' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in with email'}</button>
            {message && <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>}
            {!resetToken && <div className="flex justify-between text-sm text-[var(--color-text-accent)]"><button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Already have an account?' : 'Create an account'}</button><button type="button" onClick={() => setMode('reset')}>Forgot password?</button></div>}
          </form>}
          {(providers.includes('github') || providers.includes('google')) && <div className="space-y-3">
            {passwordEnabled && <p className="text-sm text-[var(--color-text-secondary)]">or continue with</p>}
            {providers.includes('github') && <a href="/api/auth/github" className="inline-flex w-64 items-center justify-center gap-2 rounded bg-[var(--color-accent-1)] px-6 py-3 font-medium text-[var(--color-bg)] hover:opacity-90"><GitHubIcon />Sign in with GitHub</a>}
            {providers.includes('google') && <a href="/api/auth/google" className="inline-flex w-64 items-center justify-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-highlight)] px-6 py-3 font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border-active)]"><GoogleIcon />Sign in with Google</a>}
          </div>}
        </>}
      </div>
    </div>
  );
}

function GitHubIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.345-.72-1.23-1.695-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>; }
function GoogleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>; }
