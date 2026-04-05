import { createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';

interface SpaceContextValue {
  spaceId: string;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const { spaceId } = useParams<{ spaceId: string }>();

  if (!spaceId) {
    return <div>Loading...</div>;
  }

  return (
    <SpaceContext.Provider value={{ spaceId }}>
      {children}
    </SpaceContext.Provider>
  );
}

export function useCurrentSpace(): SpaceContextValue {
  const ctx = useContext(SpaceContext);
  if (!ctx) {
    throw new Error('useCurrentSpace must be used within a SpaceProvider');
  }
  return ctx;
}
