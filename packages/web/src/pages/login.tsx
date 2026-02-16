export function LoginPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-[var(--color-text-accent)]">Planner</h1>
        <p className="text-[var(--color-text-secondary)]">Sign in to manage your life plan</p>
        <a
          href="/api/auth/github"
          className="inline-block px-6 py-3 rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90"
        >
          Sign in with GitHub
        </a>
      </div>
    </div>
  );
}
