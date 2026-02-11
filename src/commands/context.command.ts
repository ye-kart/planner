import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { today } from '../utils/date.js';

export function registerContextCommand(program: Command): void {
  const context = program
    .command('context')
    .description('Structured JSON API for AI agents and scripts (always outputs JSON)')
    .addHelpText('after', `
Designed for piping into AI agents or scripts. Every subcommand returns
structured JSON with fully resolved relationships (no extra lookups needed).

Examples:
  $ plan context today                 Today's snapshot as JSON
  $ plan context goal <id>             Goal with area, milestones, tasks, habits
  $ plan context all                   Full dump of everything
  $ plan context area <id> | jq .goals Parse with jq`);

  context
    .command('goal <id>')
    .description('Goal + area + milestones + linked tasks + linked habits')
    .action((id) => {
      ensureInitialized();
      const { contextService } = getContainer();
      console.log(JSON.stringify(contextService.goal(id), null, 2));
    });

  context
    .command('area <id>')
    .description('Area + all goals (with milestones) + all tasks + all habits')
    .action((id) => {
      ensureInitialized();
      const { contextService } = getContainer();
      console.log(JSON.stringify(contextService.area(id), null, 2));
    });

  context
    .command('task <id>')
    .description('Task + area + goal (if linked, with progress)')
    .action((id) => {
      ensureInitialized();
      const { contextService } = getContainer();
      console.log(JSON.stringify(contextService.task(id), null, 2));
    });

  context
    .command('habit <id>')
    .description('Habit + area + goal (if linked) + recent completions')
    .action((id) => {
      ensureInitialized();
      const { contextService } = getContainer();
      console.log(JSON.stringify(contextService.habit(id), null, 2));
    });

  context
    .command('today')
    .description('Today\'s snapshot: due tasks, pending habits, streaks (JSON)')
    .action(() => {
      ensureInitialized();
      const { contextService } = getContainer();
      console.log(JSON.stringify(contextService.today(today()), null, 2));
    });

  context
    .command('all')
    .description('Full dump: all areas → goals → milestones/tasks/habits (JSON)')
    .action(() => {
      ensureInitialized();
      const { contextService } = getContainer();
      console.log(JSON.stringify(contextService.all(), null, 2));
    });
}
