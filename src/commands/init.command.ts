import type { Command } from 'commander';
import { getContainer } from '../container.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize the planner database (~/.planner.db) and seed default areas')
    .addHelpText('after', `
Example:
  $ plan init        Creates the database and seeds areas: Health, Career, Finance, etc.
                     Safe to run again — existing data is preserved.`)
    .action(() => {
      const { initService } = getContainer();
      const result = initService.initialize();
      console.log(`Planner initialized at ${result.path}`);
    });
}
