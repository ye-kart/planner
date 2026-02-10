import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const areas = sqliteTable('areas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'done', 'archived'] }).notNull().default('active'),
  progress: integer('progress').notNull().default(0),
  targetDate: text('target_date'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
});

export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  position: integer('position').notNull().default(0),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
  goalId: text('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
  priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
});

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  areaId: text('area_id').references(() => areas.id, { onDelete: 'set null' }),
  goalId: text('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'specific_days'] }).notNull().default('daily'),
  days: text('days'), // JSON array of day numbers, e.g. "[1,3,5]"
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  currentStreak: integer('current_streak').notNull().default(0),
  bestStreak: integer('best_streak').notNull().default(0),
  lastCompletedAt: text('last_completed_at'),
});

export const completions = sqliteTable('completions', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  note: text('note'),
}, (table) => [
  uniqueIndex('completions_habit_date_idx').on(table.habitId, table.date),
]);

// Type exports
export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
