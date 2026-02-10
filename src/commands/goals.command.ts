import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { formatOutput } from '../utils/output.js';
import { formatGoalList, formatGoalDetail, formatGoal, formatMilestone } from '../formatters/goal.formatter.js';

export function registerGoalsCommand(program: Command): void {
  const goals = program
    .command('goals')
    .passThroughOptions()
    .description('List goals')
    .option('--area <areaId>', 'Filter by area')
    .option('--status <status>', 'Filter by status (active/done/archived)')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const filters: any = {};
      if (opts.area) filters.areaId = opts.area;
      if (opts.status) filters.status = opts.status;
      const data = goalService.list(filters);
      console.log(formatOutput(data, formatGoalList, opts));
    });

  goals
    .command('add <title>')
    .description('Create a new goal')
    .option('--area <areaId>', 'Link to area')
    .option('--target-date <date>', 'Target date (YYYY-MM-DD)')
    .option('--priority <priority>', 'Priority (low/medium/high/urgent)')
    .option('--desc <description>', 'Description')
    .option('--json', 'Output as JSON')
    .action((title, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const goal = goalService.add(title, {
        areaId: opts.area,
        targetDate: opts.targetDate,
        priority: opts.priority,
        description: opts.desc,
      });
      console.log(formatOutput(goal, formatGoal, opts));
    });

  goals
    .command('show <id>')
    .description('Show goal details with milestones, tasks, habits')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const data = goalService.show(id);
      console.log(formatOutput(data, formatGoalDetail, opts));
    });

  goals
    .command('edit <id>')
    .description('Update a goal')
    .option('--title <title>', 'New title')
    .option('--area <areaId>', 'Link to area')
    .option('--status <status>', 'Status (active/done/archived)')
    .option('--priority <priority>', 'Priority (low/medium/high/urgent)')
    .option('--target-date <date>', 'Target date (YYYY-MM-DD)')
    .option('--desc <description>', 'Description')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const updates: any = {};
      if (opts.title) updates.title = opts.title;
      if (opts.area) updates.areaId = opts.area;
      if (opts.status) updates.status = opts.status;
      if (opts.priority) updates.priority = opts.priority;
      if (opts.targetDate) updates.targetDate = opts.targetDate;
      if (opts.desc !== undefined) updates.description = opts.desc;
      const goal = goalService.edit(id, updates);
      console.log(formatOutput(goal, formatGoal, opts));
    });

  goals
    .command('progress <id> <value>')
    .description('Set goal progress manually (0-100)')
    .option('--json', 'Output as JSON')
    .action((id, value, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const goal = goalService.setProgress(id, parseInt(value, 10));
      console.log(formatOutput(goal, formatGoal, opts));
    });

  goals
    .command('done <id>')
    .description('Mark goal as complete')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const goal = goalService.markDone(id);
      console.log(formatOutput(goal, formatGoal, opts));
    });

  goals
    .command('archive <id>')
    .description('Archive a goal')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const goal = goalService.archive(id);
      console.log(formatOutput(goal, formatGoal, opts));
    });

  goals
    .command('rm <id>')
    .description('Delete a goal')
    .action((id) => {
      ensureInitialized();
      const { goalService } = getContainer();
      goalService.remove(id);
      console.log('Goal deleted.');
    });

  // Milestone sub-commands
  const ms = goals
    .command('ms')
    .description('Milestone operations');

  ms
    .command('add <goalId> <title>')
    .description('Add a milestone to a goal')
    .option('--json', 'Output as JSON')
    .action((goalId, title, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const milestone = goalService.addMilestone(goalId, title);
      console.log(formatOutput(milestone, formatMilestone, opts));
    });

  ms
    .command('toggle <msId>')
    .description('Toggle milestone done/undone')
    .option('--json', 'Output as JSON')
    .action((msId, opts) => {
      ensureInitialized();
      const { goalService } = getContainer();
      const milestone = goalService.toggleMilestone(msId);
      console.log(formatOutput(milestone, formatMilestone, opts));
    });

  ms
    .command('rm <msId>')
    .description('Delete a milestone')
    .action((msId) => {
      ensureInitialized();
      const { goalService } = getContainer();
      goalService.removeMilestone(msId);
      console.log('Milestone deleted.');
    });
}
