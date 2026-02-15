export class PlannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlannerError';
  }
}

export class NotFoundError extends PlannerError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends PlannerError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotInitializedError extends PlannerError {
  constructor() {
    super('Planner not initialized. Run "plan init" first.');
    this.name = 'NotInitializedError';
  }
}

export class ChatError extends PlannerError {
  constructor(message: string) {
    super(message);
    this.name = 'ChatError';
  }
}

export class ConfigError extends PlannerError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
