import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { formatOutput } from '../utils/output.js';
import { formatHabitList, formatHabitDetail, formatHabit, formatCompletion, formatStreaks } from '../formatters/habit.formatter.js';

export function registerHabitsCommand(program: Command): void {
  const habits = program
    .command('habits')
    .passThroughOptions()
    .description('List active habits with streaks')
    .option('--area <areaId>', 'Filter by area')
    .option('--goal <goalId>', 'Filter by goal')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const filters: any = {};
      if (opts.area) filters.areaId = opts.area;
      if (opts.goal) filters.goalId = opts.goal;
      const data = habitService.list(filters);
      console.log(formatOutput(data, formatHabitList, opts));
    });

  habits
    .command('add <title>')
    .description('Create a new habit')
    .option('--frequency <freq>', 'Frequency (daily/weekly/specific_days)')
    .option('--days <days>', 'Days for specific_days (comma-separated, 0=Sun..6=Sat)')
    .option('--area <areaId>', 'Link to area')
    .option('--goal <goalId>', 'Link to goal')
    .option('--json', 'Output as JSON')
    .action((title, opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const days = opts.days ? opts.days.split(',').map(Number) : undefined;
      const habit = habitService.add(title, {
        frequency: opts.frequency,
        days,
        areaId: opts.area,
        goalId: opts.goal,
      });
      console.log(formatOutput(habit, formatHabit, opts));
    });

  habits
    .command('show <id>')
    .description('Show habit details with stats and recent completions')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const data = habitService.show(id);
      console.log(formatOutput(data, formatHabitDetail, opts));
    });

  habits
    .command('edit <id>')
    .description('Update a habit')
    .option('--title <title>', 'New title')
    .option('--frequency <freq>', 'Frequency')
    .option('--days <days>', 'Days (comma-separated)')
    .option('--area <areaId>', 'Link to area')
    .option('--goal <goalId>', 'Link to goal')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const updates: any = {};
      if (opts.title) updates.title = opts.title;
      if (opts.frequency) updates.frequency = opts.frequency;
      if (opts.days) updates.days = opts.days.split(',').map(Number);
      if (opts.area) updates.areaId = opts.area;
      if (opts.goal) updates.goalId = opts.goal;
      const habit = habitService.edit(id, updates);
      console.log(formatOutput(habit, formatHabit, opts));
    });

  habits
    .command('check <id> [date]')
    .description('Mark habit as done for a date (default: today)')
    .option('--json', 'Output as JSON')
    .action((id, date, opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const completion = habitService.check(id, date || undefined);
      console.log(formatOutput(completion, formatCompletion, opts));
    });

  habits
    .command('uncheck <id> [date]')
    .description('Remove habit completion for a date (default: today)')
    .action((id, date) => {
      ensureInitialized();
      const { habitService } = getContainer();
      habitService.uncheck(id, date || undefined);
      console.log('Completion removed.');
    });

  habits
    .command('archive <id>')
    .description('Deactivate a habit')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const habit = habitService.archive(id);
      console.log(formatOutput(habit, formatHabit, opts));
    });

  habits
    .command('restore <id>')
    .description('Reactivate a habit')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const habit = habitService.restore(id);
      console.log(formatOutput(habit, formatHabit, opts));
    });

  habits
    .command('rm <id>')
    .description('Delete a habit (cascades completions)')
    .action((id) => {
      ensureInitialized();
      const { habitService } = getContainer();
      habitService.remove(id);
      console.log('Habit deleted.');
    });

  habits
    .command('streaks')
    .description('Show streak overview for all active habits')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      ensureInitialized();
      const { habitService } = getContainer();
      const data = habitService.streaks();
      console.log(formatOutput(data, formatStreaks, opts));
    });
}
