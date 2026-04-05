import { SpaceRepository } from '../repositories/space.repository.js';
import { generateId } from '../utils/id.js';
import { today } from '../utils/date.js';
import { NotFoundError, ValidationError } from '../errors.js';
import type { Space } from '../db/schema.js';

export class SpaceService {
  constructor(private spaceRepo: SpaceRepository) {}

  list(): Space[] {
    return this.spaceRepo.findAll();
  }

  show(id: string): Space {
    const space = this.spaceRepo.findById(id);
    if (!space) throw new NotFoundError('Space', id);
    return space;
  }

  add(name: string, options?: { description?: string; icon?: string }): Space {
    if (!name || name.length === 0 || name.length > 100) {
      throw new ValidationError('Space name must be 1-100 characters');
    }
    const position = this.spaceRepo.getMaxPosition() + 1;
    return this.spaceRepo.create({
      id: generateId(),
      name,
      description: options?.description ?? null,
      icon: options?.icon ?? null,
      position,
      createdAt: today(),
    });
  }

  edit(id: string, updates: { name?: string; description?: string; icon?: string }): Space {
    const space = this.spaceRepo.findById(id);
    if (!space) throw new NotFoundError('Space', id);
    if (updates.name !== undefined && (updates.name.length === 0 || updates.name.length > 100)) {
      throw new ValidationError('Space name must be 1-100 characters');
    }
    return this.spaceRepo.update(id, updates)!;
  }

  remove(id: string): void {
    const space = this.spaceRepo.findById(id);
    if (!space) throw new NotFoundError('Space', id);
    if (this.spaceRepo.count() <= 1) {
      throw new ValidationError('Cannot delete the last space');
    }
    this.spaceRepo.delete(id);
  }

  getDefault(): Space {
    const all = this.spaceRepo.findAll();
    if (all.length === 0) {
      throw new ValidationError('No spaces exist — run init first');
    }
    return all[0];
  }

  findByName(name: string): Space | undefined {
    return this.spaceRepo.findByName(name);
  }
}
