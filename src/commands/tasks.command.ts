import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { formatOutput } from '../utils/output.js';
import { formatTaskList, formatTaskDetail, formatTask } from '../formatters/task.formatter.js';

export function registerTasksCommand(program: Command): void {
  const tasks = program
    .command('tasks')
    .passThroughOptions()
    .description('List tasks with status, priority, and due dates')
    .option('--status <status>', 'Filter by status (todo/in_progress/done)')
    .option('--priority <priority>', 'Filter by priority (low/medium/high/urgent)')
    .option('--area <areaId>', 'Filter by area ID')
    .option('--goal <goalId>', 'Filter by goal ID')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ plan tasks                                     List all tasks
  $ plan tasks --status todo --priority high        Filter by status and priority
  $ plan tasks add "Write report" --due 2025-03-20  Create a task with a due date
  $ plan tasks start <id>                           Mark as in-progress
  $ plan tasks done <id>                            Mark as complete
  $ plan tasks today                                Tasks due today
  $ plan tasks upcoming 14                          Tasks due in the next 14 days`)
    .action((opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const filters: any = {};
      if (opts.status) filters.status = opts.status;
      if (opts.priority) filters.priority = opts.priority;
      if (opts.area) filters.areaId = opts.area;
      if (opts.goal) filters.goalId = opts.goal;
      const data = taskService.list(filters);
      console.log(formatOutput(data, formatTaskList, opts));
    });

  tasks
    .command('add <title>')
    .description('Create a new task')
    .option('--area <areaId>', 'Link to an area by ID')
    .option('--goal <goalId>', 'Link to a goal by ID')
    .option('--priority <priority>', 'Priority (low/medium/high/urgent)')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--desc <description>', 'Longer description')
    .addHelpText('after', `
Example:
  $ plan tasks add "Buy groceries" --due 2025-03-15 --priority medium --area abc123`)
    .option('--json', 'Output as JSON')
    .action((title, opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const task = taskService.add(title, {
        areaId: opts.area,
        goalId: opts.goal,
        priority: opts.priority,
        dueDate: opts.due,
        description: opts.desc,
      });
      console.log(formatOutput(task, formatTask, opts));
    });

  tasks
    .command('show <id>')
    .description('Show task details')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const data = taskService.show(id);
      console.log(formatOutput(data, formatTaskDetail, opts));
    });

  tasks
    .command('edit <id>')
    .description('Update a task')
    .option('--title <title>', 'New title')
    .option('--status <status>', 'Status (todo/in_progress/done)')
    .option('--priority <priority>', 'Priority (low/medium/high/urgent)')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--area <areaId>', 'Link to area by ID')
    .option('--goal <goalId>', 'Link to goal by ID')
    .option('--desc <description>', 'Longer description')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const updates: any = {};
      if (opts.title) updates.title = opts.title;
      if (opts.status) updates.status = opts.status;
      if (opts.priority) updates.priority = opts.priority;
      if (opts.due) updates.dueDate = opts.due;
      if (opts.area) updates.areaId = opts.area;
      if (opts.goal) updates.goalId = opts.goal;
      if (opts.desc !== undefined) updates.description = opts.desc;
      const task = taskService.edit(id, updates);
      console.log(formatOutput(task, formatTask, opts));
    });

  tasks
    .command('done <id>')
    .description('Mark task as done')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const task = taskService.markDone(id);
      console.log(formatOutput(task, formatTask, opts));
    });

  tasks
    .command('start <id>')
    .description('Mark task as in-progress')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const task = taskService.start(id);
      console.log(formatOutput(task, formatTask, opts));
    });

  tasks
    .command('rm <id>')
    .description('Delete a task')
    .action((id) => {
      ensureInitialized();
      const { taskService } = getContainer();
      taskService.remove(id);
      console.log('Task deleted.');
    });

  tasks
    .command('upcoming [days]')
    .description('Show tasks due within N days (default: 7)')
    .option('--json', 'Output as JSON')
    .action((days, opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const data = taskService.upcoming(days ? parseInt(days, 10) : 7);
      console.log(formatOutput(data, formatTaskList, opts));
    });

  tasks
    .command('today')
    .description('Show tasks due today')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      ensureInitialized();
      const { taskService } = getContainer();
      const data = taskService.dueToday();
      console.log(formatOutput(data, formatTaskList, opts));
    });
}
