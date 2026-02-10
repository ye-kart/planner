import { useState, useCallback } from 'react';

export function useRefresh(): [number, () => void] {
  const [key, setKey] = useState(0);
  const refresh = useCallback(() => setKey(k => k + 1), []);
  return [key, refresh];
}
