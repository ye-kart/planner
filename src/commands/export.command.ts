import { writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Command } from 'commander';
import { getContainer } from '../container.js';
import { ensureInitialized } from '../utils/guard.js';

export function registerExportCommand(program: Command): void {
  program
    .command('export')
    .description('Export all planner data to a well-formatted Markdown file')
    .requiredOption('--output <path>', 'Output file path (e.g. ./planner.md)')
    .option('--json', 'Export as JSON instead of Markdown')
    .addHelpText('after', `
Example:
  $ plan export --output ./planner.md       Export as formatted Markdown
  $ plan export --output ./data.json --json Export as JSON`)
    .action((opts) => {
      ensureInitialized();
      const { exportService, contextService } = getContainer();
      const outputPath = resolve(opts.output);

      if (opts.json) {
        const data = contextService.all();
        writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      } else {
        const markdown = exportService.generateMarkdown();
        writeFileSync(outputPath, markdown, 'utf-8');
      }

      console.log(`Exported to ${outputPath}`);
    });
}
