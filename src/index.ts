#!/usr/bin/env node
import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { PlannerError } from './errors.js';

const program = new Command();

program
  .name('plan')
  .description('A CLI life planner — organize areas, goals, tasks, and habits')
  .version('1.0.0')
  .enablePositionalOptions()
  .addHelpText('after', `
Getting started:
  $ plan init                          Set up the database (~/.planner.db)
  $ plan areas                         See your life areas
  $ plan goals add "Learn Spanish"     Create a goal
  $ plan tasks add "Buy textbook"      Create a task
  $ plan habits add "Study 30 min"     Create a daily habit
  $ plan status                        See today's dashboard
  $ plan tui                           Launch interactive terminal UI

Hierarchy:  Areas → Goals → Tasks / Habits
All commands support --json for machine-readable output.
Use "plan <command> --help" for details on any command.`);

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
