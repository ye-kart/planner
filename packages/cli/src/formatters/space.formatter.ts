import type { Space } from '@planner/core';

export function formatSpaceList(spaces: Space[], currentId?: string): string {
  if (spaces.length === 0) return 'No spaces found.';

  const lines: string[] = ['Spaces:', ''];
  for (const space of spaces) {
    const marker = space.id === currentId ? '*' : ' ';
    const icon = space.icon ? `${space.icon} ` : '';
    lines.push(`  ${marker} ${space.id}  ${icon}${space.name}`);
    if (space.description) lines.push(`              ${space.description}`);
  }
  return lines.join('\n');
}

export function formatSpace(space: Space): string {
  const icon = space.icon ? `${space.icon} ` : '';
  const lines = [`${icon}${space.name} (${space.id})`];
  if (space.description) lines.push(`Description: ${space.description}`);
  return lines.join('\n');
}
