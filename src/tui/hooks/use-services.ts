import { createContext, useContext } from 'react';
import type { getContainer } from '../../container.js';

export type Container = ReturnType<typeof getContainer>;

export const ServicesContext = createContext<Container | null>(null);

export function useServices(): Container {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used within ServicesContext.Provider');
  return ctx;
}
