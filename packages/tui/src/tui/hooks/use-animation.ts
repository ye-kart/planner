import { useState, useEffect, useRef } from 'react';

export function useAnimation(intervalMs: number, maxFrames?: number): number {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      frameRef.current += 1;
      if (maxFrames !== undefined && frameRef.current >= maxFrames) {
        clearInterval(id);
        return;
      }
      setFrame(frameRef.current);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, maxFrames]);

  return frame;
}
