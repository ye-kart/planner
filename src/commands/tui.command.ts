import type { Command } from 'commander';
import { ensureInitialized } from '../utils/guard.js';
import { getContainer } from '../container.js';

export function registerTuiCommand(program: Command): void {
  program
    .command('tui')
    .description('Launch interactive terminal UI')
    .option('--theme <theme>', 'Color theme: neon, matrix, purple', 'neon')
    .action(async (opts) => {
      ensureInitialized();
      const container = getContainer();
      const { renderApp } = await import('../tui/app.js');
      renderApp(container, opts.theme);
    });
}
