import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';
import { formatOutput } from '../utils/output.js';
import { formatStatus } from '../formatters/status.formatter.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show today\'s dashboard: due tasks, habits, and streaks')
    .option('--json', 'Output as JSON')
    .addHelpText('after', `
Example:
  $ plan status              Human-readable daily overview
  $ plan status --json       Machine-readable JSON output`)
    .action((opts) => {
      ensureInitialized();
      const { statusService } = getContainer();
      const data = statusService.getStatus();
      console.log(formatOutput(data, formatStatus, opts));
    });
}
