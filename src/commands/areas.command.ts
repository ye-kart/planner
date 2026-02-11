import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { formatOutput } from '../utils/output.js';
import { formatAreaList, formatAreaDetail, formatArea } from '../formatters/area.formatter.js';

export function registerAreasCommand(program: Command): void {
  const areas = program
    .command('areas')
    .passThroughOptions()
    .description('List all life areas (e.g. Health, Career) with goal/task counts')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ plan areas                         List all areas with stats
  $ plan areas add "Side Projects"     Create a new area
  $ plan areas show <id>               Show area with its goals, tasks, habits
  $ plan areas edit <id> --name "Fun"  Rename an area`)
    .action((opts) => {
      ensureInitialized();
      const { areaService } = getContainer();
      const data = areaService.list();
      console.log(formatOutput(data, formatAreaList, opts));
    });

  areas
    .command('add <name>')
    .description('Create a new life area')
    .option('--desc <description>', 'Area description')
    .addHelpText('after', `
Example:
  $ plan areas add "Side Projects" --desc "Weekend coding & hobby apps"`)
    .option('--json', 'Output as JSON')
    .action((name, opts) => {
      ensureInitialized();
      const { areaService } = getContainer();
      const area = areaService.add(name, opts.desc);
      console.log(formatOutput(area, formatArea, opts));
    });

  areas
    .command('edit <id>')
    .description('Update an area')
    .option('--name <name>', 'New name')
    .option('--desc <description>', 'New description')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { areaService } = getContainer();
      const updates: any = {};
      if (opts.name) updates.name = opts.name;
      if (opts.desc !== undefined) updates.description = opts.desc;
      const area = areaService.edit(id, updates);
      console.log(formatOutput(area, formatArea, opts));
    });

  areas
    .command('rm <id>')
    .description('Delete an area (goals/tasks/habits are kept but unlinked)')
    .action((id) => {
      ensureInitialized();
      const { areaService } = getContainer();
      areaService.remove(id);
      console.log('Area deleted.');
    });

  areas
    .command('show <id>')
    .description('Show area details with goals, tasks, habits')
    .option('--json', 'Output as JSON')
    .action((id, opts) => {
      ensureInitialized();
      const { areaService } = getContainer();
      const data = areaService.show(id);
      console.log(formatOutput(data, formatAreaDetail, opts));
    });
}
