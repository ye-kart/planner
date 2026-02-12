import type { Command } from 'commander';
import { ensureInitialized } from '../utils/guard.js';
import { getContainer } from '../container.js';
import { getDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';

export function registerTuiCommand(program: Command): void {
  program
    .command('tui')
    .description('Launch interactive terminal UI with full CRUD for all entities')
    .option('--theme <theme>', 'Color theme: neon, matrix, or purple (default: neon)', 'neon')
    .addHelpText('after', `
Examples:
  $ plan tui                  Launch with default neon theme
  $ plan tui --theme purple   Launch with purple theme
  $ plan tui --theme matrix   Launch with matrix theme`)
    .action(async (opts) => {
      ensureInitialized();
      runMigrations(getDb());
      const container = getContainer();
      const { renderApp } = await import('../tui/app.js');
      renderApp(container, opts.theme);
    });
}
