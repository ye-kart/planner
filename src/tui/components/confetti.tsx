import { Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useAnimation } from '../hooks/use-animation.js';

const PARTICLES = ['*', '+', '.', '·', '✦', '⋆'];

interface ConfettiProps {
  active: boolean;
}

export function Confetti({ active }: ConfettiProps) {
  const { colors } = useTheme();
  const frame = useAnimation(150, 6);

  if (!active || frame >= 5) return null;

  const particleColors = [colors.accent1, colors.accent2, colors.success, colors.warning];
  const line = Array.from({ length: 8 }, () => {
    const p = PARTICLES[Math.floor(Math.random() * PARTICLES.length)]!;
    const c = particleColors[Math.floor(Math.random() * particleColors.length)]!;
    return { char: p, color: c };
  });

  return (
    <Text>
      {line.map((p, i) => (
        <Text key={i} color={p.color}>{p.char} </Text>
      ))}
    </Text>
  );
}
