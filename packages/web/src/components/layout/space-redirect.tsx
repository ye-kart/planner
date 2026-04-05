import { Navigate } from 'react-router-dom';
import { useSpaces } from '../../hooks/use-api';

export function SpaceRedirect() {
  const { data: spaces, isLoading } = useSpaces();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-[var(--color-text-secondary)]">Loading...</div>;
  }

  if (spaces && spaces.length > 0) {
    return <Navigate to={`/spaces/${spaces[0].id}`} replace />;
  }

  return <div className="flex items-center justify-center h-screen text-[var(--color-text-secondary)]">No spaces found.</div>;
}
