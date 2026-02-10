import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { formatOutput } from '../utils/output.js';
import { formatAreaList, formatAreaDetail, formatArea } from '../formatters/area.formatter.js';

export function registerAreasCommand(program: Command): void {
  const areas = program
    .command('areas')
    .passThroughOptions()
    .description('List all areas with stats')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      ensureInitialized();
      const { areaService } = getContainer();
      const data = areaService.list();
      console.log(formatOutput(data, formatAreaList, opts));
    });

  areas
    .command('add <name>')
    .description('Create a new area')
    .option('--desc <description>', 'Area description')
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
    .description('Delete an area')
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
