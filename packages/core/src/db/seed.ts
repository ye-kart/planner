import { areas } from './schema.js';
import { generateId } from '../utils/id.js';
import type { DB } from './connection.js';

const DEFAULT_AREAS = [
  'Health',
  'Career',
  'Finance',
  'Relationships',
  'Learning',
  'Family',
  'Spirituality',
  'Hobbies',
  'Home',
  'Community',
];

export function seedDefaultAreas(db: DB): void {
  const existing = db.select().from(areas).all();
  if (existing.length > 0) return; // Already seeded

  for (let i = 0; i < DEFAULT_AREAS.length; i++) {
    db.insert(areas).values({
      id: generateId(),
      name: DEFAULT_AREAS[i],
      position: i,
    }).run();
  }
}
