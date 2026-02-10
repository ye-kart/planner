import type { Command } from 'commander';
import { getContainer } from '../container.js';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize the planner database and seed default areas')
    .action(() => {
      const { initService } = getContainer();
      const result = initService.initialize();
      console.log(`Planner initialized at ${result.path}`);
    });
}
