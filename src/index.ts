#!/usr/bin/env node
import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { PlannerError } from './errors.js';

const program = new Command();

program
  .name('plan')
  .description('A headless CLI life planner')
  .version('1.0.0')
  .enablePositionalOptions();

registerCommands(program);

try {
  program.parse();
} catch (err) {
  if (err instanceof PlannerError) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
