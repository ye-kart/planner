import type { Command } from 'commander';
import { getContainer, ensureInitialized, formatOutput } from '@planner/core';
import { formatSpaceList, formatSpace } from '../formatters/space.formatter.js';

export function registerSpacesCommand(program: Command): void {
  const spaces = program
    .command('spaces')
    .passThroughOptions()
    .description('List all spaces')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Examples:
  $ plan spaces                          List all spaces
  $ plan spaces add "Work"               Create a new space
  $ plan spaces switch Work              Switch to a space by name or ID
  $ plan spaces current                  Show the current space`)
    .action((opts) => {
      ensureInitialized();
      const { spaceService, configService } = getContainer();
      const data = spaceService.list();
      const currentId = configService.getCurrentSpaceId() ?? undefined;
      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(formatSpaceList(data, currentId));
      }
    });

  spaces
    .command('add <name>')
    .description('Create a new space')
    .option('--desc <description>', 'Space description')
    .option('--icon <icon>', 'Space icon (emoji)')
    .option('--json', 'Output as JSON')
    .action((name, opts) => {
      ensureInitialized();
      const { spaceService } = getContainer();
      const space = spaceService.add(name, { description: opts.desc, icon: opts.icon });
      console.log(formatOutput(space, formatSpace, opts));
    });

  spaces
    .command('switch <nameOrId>')
    .description('Switch the current space')
    .action((nameOrId) => {
      ensureInitialized();
      const { spaceService, configService } = getContainer();

      // Try by ID first, then by name
      let space = spaceService.list().find(s => s.id === nameOrId);
      if (!space) {
        space = spaceService.findByName(nameOrId);
      }
      if (!space) {
        console.error(`Space not found: ${nameOrId}`);
        process.exit(1);
      }

      configService.setCurrentSpaceId(space.id);
      const icon = space.icon ? `${space.icon} ` : '';
      console.log(`Switched to ${icon}${space.name}`);
    });

  spaces
    .command('rename <id> <name>')
    .description('Rename a space')
    .option('--json', 'Output as JSON')
    .action((id, name, opts) => {
      ensureInitialized();
      const { spaceService } = getContainer();
      const space = spaceService.edit(id, { name });
      console.log(formatOutput(space, formatSpace, opts));
    });

  spaces
    .command('rm <id>')
    .description('Delete a space and all its data')
    .action((id) => {
      ensureInitialized();
      const { spaceService, configService } = getContainer();
      const currentId = configService.getCurrentSpaceId();
      if (id === currentId) {
        console.error('Cannot delete the current space. Switch to another space first.');
        process.exit(1);
      }
      spaceService.remove(id);
      console.log('Space deleted.');
    });

  spaces
    .command('current')
    .description('Show the current active space')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      ensureInitialized();
      const { spaceService, configService } = getContainer();
      const currentId = configService.getCurrentSpaceId();
      const space = currentId
        ? spaceService.list().find(s => s.id === currentId)
        : spaceService.getDefault();
      if (!space) {
        console.error('No current space set.');
        process.exit(1);
      }
      console.log(formatOutput(space, formatSpace, opts));
    });
}
