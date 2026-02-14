import type { Command } from 'commander';
import { registerInitCommand } from './init.command.js';
import { registerStatusCommand } from './status.command.js';
import { registerAreasCommand } from './areas.command.js';
import { registerGoalsCommand } from './goals.command.js';
import { registerTasksCommand } from './tasks.command.js';
import { registerHabitsCommand } from './habits.command.js';
import { registerContextCommand } from './context.command.js';
import { registerTuiCommand } from './tui.command.js';
import { registerExportCommand } from './export.command.js';

export function registerCommands(program: Command): void {
  registerInitCommand(program);
  registerStatusCommand(program);
  registerAreasCommand(program);
  registerGoalsCommand(program);
  registerTasksCommand(program);
  registerHabitsCommand(program);
  registerContextCommand(program);
  registerExportCommand(program);
  registerTuiCommand(program);
}
