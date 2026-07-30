import { McpServer, type ToolAnnotations } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import { PlannerError, type CoreContainer, type McpScope } from '@planner/core';

const ID_PATTERN = /^[A-Za-z0-9]{8}$/;
const IdSchema = z.string().regex(ID_PATTERN, 'Expected an 8-character Planner ID');
const DateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine(isCalendarDate, 'Expected a valid calendar date');
const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
const GoalStatusSchema = z.enum(['active', 'done', 'archived']);
const TaskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
const FrequencySchema = z.enum(['daily', 'weekly', 'specific_days']);
const ListWindowSchema = {
  offset: z.number().int().min(0).max(100_000).default(0),
  limit: z.number().int().min(1).max(100).default(50),
};

const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
const IDEMPOTENT_WRITE: ToolAnnotations = {
  ...WRITE,
  idempotentHint: true,
};

export function registerPlannerTools(
  server: McpServer,
  container: CoreContainer,
  scopes: McpScope[],
): void {
  if (scopes.includes('planner:read')) {
    registerReadTools(server, container);
  }
  if (scopes.includes('planner:write')) {
    registerWriteTools(server, container);
  }
}

function registerReadTools(server: McpServer, container: CoreContainer): void {
  server.registerTool('get_today', {
    title: 'Get today',
    description: 'Get today’s due tasks, overdue tasks, habits, streaks, and summary for the authorized Planner space.',
    inputSchema: z.object({}).strict(),
    annotations: READ_ONLY,
  }, () => result(() => {
    const status = container.statusService.getStatus();
    return {
      ...status,
      tasksDueToday: status.tasksDueToday.slice(0, 100),
      tasksOverdue: status.tasksOverdue.slice(0, 100),
      habitsDueToday: status.habitsDueToday.slice(0, 100).map(normalizeHabit),
      truncated: status.tasksDueToday.length > 100
        || status.tasksOverdue.length > 100
        || status.habitsDueToday.length > 100,
    };
  }));

  server.registerTool('list_areas', {
    title: 'List areas',
    description: 'List life areas in the authorized Planner space. Results are paginated and never cross the token’s space.',
    inputSchema: z.object(ListWindowSchema).strict(),
    annotations: READ_ONLY,
  }, ({ offset, limit }) => result(() => page(container.areaService.list(), offset, limit)));

  server.registerTool('get_area', {
    title: 'Get area',
    description: 'Get one area and a bounded view of its related goals, tasks, and habits.',
    inputSchema: z.object({ id: IdSchema }).strict(),
    annotations: READ_ONLY,
  }, ({ id }) => result(() => {
    const area = container.areaService.show(id);
    return {
      ...area,
      goals: area.goals.slice(0, 100),
      tasks: area.tasks.slice(0, 100),
      habits: area.habits.slice(0, 100).map(normalizeHabit),
      truncated: area.goals.length > 100 || area.tasks.length > 100 || area.habits.length > 100,
    };
  }));

  server.registerTool('list_goals', {
    title: 'List goals',
    description: 'List goals in the authorized Planner space, optionally filtered by area or status.',
    inputSchema: z.object({
      areaId: IdSchema.optional(),
      status: GoalStatusSchema.optional(),
      ...ListWindowSchema,
    }).strict(),
    annotations: READ_ONLY,
  }, ({ areaId, status, offset, limit }) =>
    result(() => page(container.goalService.list({ areaId, status }), offset, limit)));

  server.registerTool('get_goal', {
    title: 'Get goal',
    description: 'Get one goal and a bounded view of its milestones, tasks, habits, and area.',
    inputSchema: z.object({ id: IdSchema }).strict(),
    annotations: READ_ONLY,
  }, ({ id }) => result(() => {
    const goal = container.goalService.show(id);
    return {
      ...goal,
      milestones: goal.milestones.slice(0, 100),
      tasks: goal.tasks.slice(0, 100),
      habits: goal.habits.slice(0, 100).map(normalizeHabit),
      truncated: goal.milestones.length > 100 || goal.tasks.length > 100 || goal.habits.length > 100,
    };
  }));

  server.registerTool('list_tasks', {
    title: 'List tasks',
    description: 'List tasks in the authorized Planner space, with optional status, priority, area, or goal filters.',
    inputSchema: z.object({
      status: TaskStatusSchema.optional(),
      priority: PrioritySchema.optional(),
      areaId: IdSchema.optional(),
      goalId: IdSchema.optional(),
      ...ListWindowSchema,
    }).strict(),
    annotations: READ_ONLY,
  }, ({ status, priority, areaId, goalId, offset, limit }) =>
    result(() => page(container.taskService.list({ status, priority, areaId, goalId }), offset, limit)));

  server.registerTool('get_task', {
    title: 'Get task',
    description: 'Get one task from the authorized Planner space.',
    inputSchema: z.object({ id: IdSchema }).strict(),
    annotations: READ_ONLY,
  }, ({ id }) => result(() => container.taskService.show(id)));

  server.registerTool('list_habits', {
    title: 'List habits',
    description: 'List active habits in the authorized Planner space, optionally filtered by area or goal.',
    inputSchema: z.object({
      areaId: IdSchema.optional(),
      goalId: IdSchema.optional(),
      ...ListWindowSchema,
    }).strict(),
    annotations: READ_ONLY,
  }, ({ areaId, goalId, offset, limit }) =>
    result(() => {
      const habits = container.habitService.list({ areaId, goalId }).map(normalizeHabit);
      return page(habits, offset, limit);
    }));

  server.registerTool('get_habit', {
    title: 'Get habit',
    description: 'Get one habit, its links, and up to 30 recent completions from the authorized Planner space.',
    inputSchema: z.object({ id: IdSchema }).strict(),
    annotations: READ_ONLY,
  }, ({ id }) => result(() => normalizeHabit(container.habitService.show(id))));
}

function registerWriteTools(server: McpServer, container: CoreContainer): void {
  server.registerTool('create_area', {
    title: 'Create area',
    description: 'Create a life area in the authorized Planner space.',
    inputSchema: z.object({
      name: z.string().trim().min(1).max(100),
      description: z.string().max(2_000).optional(),
    }).strict(),
    annotations: WRITE,
  }, ({ name, description }) => result(() => container.areaService.add(name, description)));

  server.registerTool('update_area', {
    title: 'Update area',
    description: 'Update the name or description of an area in the authorized Planner space.',
    inputSchema: z.object({
      id: IdSchema,
      name: z.string().trim().min(1).max(100).optional(),
      description: z.string().max(2_000).optional(),
    }).strict().refine(hasUpdateBesidesId, 'Provide at least one field to update'),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, name, description }) => result(() => {
    const updates: { name?: string; description?: string } = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    return container.areaService.edit(id, updates);
  }));

  server.registerTool('create_goal', {
    title: 'Create goal',
    description: 'Create a goal in the authorized Planner space.',
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200),
      areaId: IdSchema.optional(),
      targetDate: DateSchema.optional(),
      priority: PrioritySchema.optional(),
      description: z.string().max(10_000).optional(),
    }).strict(),
    annotations: WRITE,
  }, ({ title, ...options }) => result(() => container.goalService.add(title, options)));

  server.registerTool('update_goal', {
    title: 'Update goal',
    description: 'Update a goal in the authorized Planner space. Null unlinks an area or clears nullable text/date fields.',
    inputSchema: z.object({
      id: IdSchema,
      title: z.string().trim().min(1).max(200).optional(),
      areaId: IdSchema.nullable().optional(),
      status: GoalStatusSchema.optional(),
      priority: PrioritySchema.optional(),
      targetDate: DateSchema.nullable().optional(),
      description: z.string().max(10_000).nullable().optional(),
    }).strict().refine(hasUpdateBesidesId, 'Provide at least one field to update'),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, ...updates }) => result(() => container.goalService.edit(id, updates)));

  server.registerTool('set_goal_progress', {
    title: 'Set goal progress',
    description: 'Set a goal’s progress to an exact value from 0 to 100.',
    inputSchema: z.object({
      id: IdSchema,
      progress: z.number().int().min(0).max(100),
    }).strict(),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, progress }) => result(() => container.goalService.setProgress(id, progress)));

  server.registerTool('add_milestone', {
    title: 'Add milestone',
    description: 'Add a milestone to a goal in the authorized Planner space.',
    inputSchema: z.object({
      goalId: IdSchema,
      title: z.string().trim().min(1).max(200),
    }).strict(),
    annotations: WRITE,
  }, ({ goalId, title }) => result(() => container.goalService.addMilestone(goalId, title)));

  server.registerTool('set_milestone_done', {
    title: 'Set milestone state',
    description: 'Set a milestone to done or not done without toggle ambiguity.',
    inputSchema: z.object({
      id: IdSchema,
      done: z.boolean(),
    }).strict(),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, done }) => result(() => container.goalService.setMilestoneDone(id, done)));

  server.registerTool('create_task', {
    title: 'Create task',
    description: 'Create a task in the authorized Planner space.',
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200),
      areaId: IdSchema.optional(),
      goalId: IdSchema.optional(),
      priority: PrioritySchema.optional(),
      dueDate: DateSchema.optional(),
      description: z.string().max(10_000).optional(),
    }).strict(),
    annotations: WRITE,
  }, ({ title, ...options }) => result(() => container.taskService.add(title, options)));

  server.registerTool('update_task', {
    title: 'Update task',
    description: 'Update a task in the authorized Planner space. Setting status to done records completion time.',
    inputSchema: z.object({
      id: IdSchema,
      title: z.string().trim().min(1).max(200).optional(),
      status: TaskStatusSchema.optional(),
      priority: PrioritySchema.optional(),
      dueDate: DateSchema.nullable().optional(),
      areaId: IdSchema.nullable().optional(),
      goalId: IdSchema.nullable().optional(),
      description: z.string().max(10_000).nullable().optional(),
    }).strict().refine(hasUpdateBesidesId, 'Provide at least one field to update'),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, ...updates }) => result(() => container.taskService.edit(id, updates)));

  server.registerTool('create_habit', {
    title: 'Create habit',
    description: 'Create a habit in the authorized Planner space.',
    inputSchema: z.object({
      title: z.string().trim().min(1).max(200),
      frequency: FrequencySchema.optional(),
      days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
      areaId: IdSchema.optional(),
      goalId: IdSchema.optional(),
    }).strict().refine(
      value => value.frequency !== 'specific_days' || (value.days?.length ?? 0) > 0,
      { message: 'days are required for specific_days frequency', path: ['days'] },
    ),
    annotations: WRITE,
  }, ({ title, ...options }) => result(() => normalizeHabit(container.habitService.add(title, options))));

  server.registerTool('update_habit', {
    title: 'Update habit',
    description: 'Update a habit in the authorized Planner space.',
    inputSchema: z.object({
      id: IdSchema,
      title: z.string().trim().min(1).max(200).optional(),
      frequency: FrequencySchema.optional(),
      days: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
      areaId: IdSchema.nullable().optional(),
      goalId: IdSchema.nullable().optional(),
    }).strict()
      .refine(hasUpdateBesidesId, 'Provide at least one field to update')
      .refine(
        value => value.frequency !== 'specific_days' || (value.days?.length ?? 0) > 0,
        { message: 'days are required for specific_days frequency', path: ['days'] },
      ),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, ...updates }) => result(() => normalizeHabit(container.habitService.edit(id, updates))));

  server.registerTool('set_habit_completion', {
    title: 'Set habit completion',
    description: 'Idempotently set whether a habit is complete for a date. Defaults to today.',
    inputSchema: z.object({
      id: IdSchema,
      completed: z.boolean(),
      date: DateSchema.optional(),
    }).strict(),
    annotations: IDEMPOTENT_WRITE,
  }, ({ id, completed, date }) => result(() => container.habitService.setCompletion(id, completed, date)));
}

function result(fn: () => unknown) {
  try {
    const data = fn();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data) }],
    };
  } catch (error) {
    const message = error instanceof PlannerError ? error.message : 'Planner could not complete this operation';
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}

function page<T>(items: T[], offset: number, limit: number) {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    offset,
    limit,
    hasMore: offset + limit < items.length,
  };
}

function normalizeHabit<T extends { days: string | null }>(habit: T): Omit<T, 'days'> & { days: number[] | null } {
  let days: number[] | null = null;
  if (habit.days) {
    try {
      const parsed: unknown = JSON.parse(habit.days);
      if (Array.isArray(parsed) && parsed.every(day => typeof day === 'number')) {
        days = parsed;
      }
    } catch {
      days = null;
    }
  }
  return { ...habit, days };
}

function hasUpdateBesidesId(value: Record<string, unknown>): boolean {
  return Object.keys(value).some(key => key !== 'id');
}

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
