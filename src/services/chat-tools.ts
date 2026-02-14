import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import type { AreaService } from './area.service.js';
import type { GoalService } from './goal.service.js';
import type { TaskService } from './task.service.js';
import type { HabitService } from './habit.service.js';

const ALLOWED_EXTENSIONS = new Set(['.md', '.txt', '.json', '.csv', '.yaml', '.yml']);
const MAX_CONTENT_LENGTH = 50_000;

interface ToolParam {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}

interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParam>;
    required?: string[];
  };
}

interface ToolDefinition {
  type: 'function';
  function: ToolFunction;
}

export function getToolDefinitions(): ToolDefinition[] {
  return [
    // --- Areas ---
    {
      type: 'function',
      function: {
        name: 'list_areas',
        description: 'List all areas of life/responsibility',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_area',
        description: 'Create a new area',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Area name (1-100 chars)' },
            description: { type: 'string', description: 'Optional description' },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'edit_area',
        description: 'Edit an existing area',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Area ID' },
            name: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_area',
        description: 'Delete an area (children become unlinked)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Area ID' },
          },
          required: ['id'],
        },
      },
    },
    // --- Goals ---
    {
      type: 'function',
      function: {
        name: 'list_goals',
        description: 'List goals, optionally filtered by area or status',
        parameters: {
          type: 'object',
          properties: {
            areaId: { type: 'string', description: 'Filter by area ID' },
            status: { type: 'string', description: 'Filter by status', enum: ['active', 'done', 'archived'] },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_goal',
        description: 'Create a new goal',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Goal title (1-200 chars)' },
            areaId: { type: 'string', description: 'Link to area ID' },
            targetDate: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
            priority: { type: 'string', description: 'Priority level', enum: ['low', 'medium', 'high', 'urgent'] },
            description: { type: 'string', description: 'Goal description' },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'edit_goal',
        description: 'Edit an existing goal',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Goal ID' },
            title: { type: 'string', description: 'New title' },
            areaId: { type: 'string', description: 'New area ID (empty string to unlink)' },
            status: { type: 'string', description: 'New status', enum: ['active', 'done', 'archived'] },
            priority: { type: 'string', description: 'New priority', enum: ['low', 'medium', 'high', 'urgent'] },
            targetDate: { type: 'string', description: 'New target date (YYYY-MM-DD or empty to clear)' },
            description: { type: 'string', description: 'New description' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_goal',
        description: 'Delete a goal (milestones cascade, tasks/habits become unlinked)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Goal ID' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_goal_progress',
        description: 'Set goal progress (0-100)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Goal ID' },
            progress: { type: 'number', description: 'Progress value 0-100' },
          },
          required: ['id', 'progress'],
        },
      },
    },
    // --- Tasks ---
    {
      type: 'function',
      function: {
        name: 'list_tasks',
        description: 'List tasks, optionally filtered by status, priority, area, or goal',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status', enum: ['todo', 'in_progress', 'done'] },
            priority: { type: 'string', description: 'Filter by priority', enum: ['low', 'medium', 'high', 'urgent'] },
            areaId: { type: 'string', description: 'Filter by area ID' },
            goalId: { type: 'string', description: 'Filter by goal ID' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_task',
        description: 'Create a new task',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title (1-200 chars)' },
            areaId: { type: 'string', description: 'Link to area ID' },
            goalId: { type: 'string', description: 'Link to goal ID' },
            priority: { type: 'string', description: 'Priority level', enum: ['low', 'medium', 'high', 'urgent'] },
            dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD)' },
            description: { type: 'string', description: 'Task description' },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'edit_task',
        description: 'Edit an existing task',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
            title: { type: 'string', description: 'New title' },
            status: { type: 'string', description: 'New status', enum: ['todo', 'in_progress', 'done'] },
            priority: { type: 'string', description: 'New priority', enum: ['low', 'medium', 'high', 'urgent'] },
            dueDate: { type: 'string', description: 'New due date (YYYY-MM-DD or empty to clear)' },
            areaId: { type: 'string', description: 'New area ID (empty to unlink)' },
            goalId: { type: 'string', description: 'New goal ID (empty to unlink)' },
            description: { type: 'string', description: 'New description' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'complete_task',
        description: 'Mark a task as done',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_task',
        description: 'Delete a task permanently',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
          },
          required: ['id'],
        },
      },
    },
    // --- Habits ---
    {
      type: 'function',
      function: {
        name: 'list_habits',
        description: 'List active habits, optionally filtered by area or goal',
        parameters: {
          type: 'object',
          properties: {
            areaId: { type: 'string', description: 'Filter by area ID' },
            goalId: { type: 'string', description: 'Filter by goal ID' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_habit',
        description: 'Create a new habit',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Habit title (1-200 chars)' },
            frequency: { type: 'string', description: 'How often', enum: ['daily', 'weekly', 'specific_days'] },
            days: { type: 'array', description: 'Day numbers for specific_days (0=Sun..6=Sat)', items: { type: 'number' } },
            areaId: { type: 'string', description: 'Link to area ID' },
            goalId: { type: 'string', description: 'Link to goal ID' },
          },
          required: ['title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'check_habit',
        description: 'Mark a habit as done for today (or a specific date)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Habit ID' },
            date: { type: 'string', description: 'Date to check (YYYY-MM-DD, defaults to today)' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'uncheck_habit',
        description: 'Remove habit completion for today (or a specific date)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Habit ID' },
            date: { type: 'string', description: 'Date to uncheck (YYYY-MM-DD, defaults to today)' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_habit',
        description: 'Delete a habit and all its completions permanently',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Habit ID' },
          },
          required: ['id'],
        },
      },
    },
    // --- Milestones ---
    {
      type: 'function',
      function: {
        name: 'add_milestone',
        description: 'Add a milestone to a goal',
        parameters: {
          type: 'object',
          properties: {
            goalId: { type: 'string', description: 'Goal ID' },
            title: { type: 'string', description: 'Milestone title (1-200 chars)' },
          },
          required: ['goalId', 'title'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'toggle_milestone',
        description: 'Toggle a milestone done/not-done',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Milestone ID' },
          },
          required: ['id'],
        },
      },
    },
    // --- Document ---
    {
      type: 'function',
      function: {
        name: 'read_document',
        description: 'Read a document file from disk. Use this when the user asks you to analyze, import, or review an external file. Supports .md, .txt, .json, .csv, .yaml, .yml files. Returns the file contents so you can compare against current planning data and suggest new goals, tasks, or habits.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read (absolute or relative to working directory)' },
          },
          required: ['path'],
        },
      },
    },
  ];
}

interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ToolServices {
  areaService: AreaService;
  goalService: GoalService;
  taskService: TaskService;
  habitService: HabitService;
}

export function executeTool(name: string, argsJson: string, services: ToolServices): ToolResult {
  try {
    const args = JSON.parse(argsJson || '{}');

    // Utility tools (no service dependencies)
    if (name === 'read_document') {
      return readDocument(args.path);
    }

    const { areaService, goalService, taskService, habitService } = services;

    switch (name) {
      // Areas
      case 'list_areas': {
        const areas = areaService.list();
        return { success: true, message: `Found ${areas.length} areas`, data: areas };
      }
      case 'create_area': {
        const area = areaService.add(args.name, args.description);
        return { success: true, message: `Created area "${area.name}" (${area.id})`, data: area };
      }
      case 'edit_area': {
        const updates: Record<string, string> = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        const area = areaService.edit(args.id, updates);
        return { success: true, message: `Updated area "${area.name}"`, data: area };
      }
      case 'delete_area': {
        areaService.remove(args.id);
        return { success: true, message: `Deleted area ${args.id}` };
      }

      // Goals
      case 'list_goals': {
        const goals = goalService.list({ areaId: args.areaId, status: args.status });
        return { success: true, message: `Found ${goals.length} goals`, data: goals };
      }
      case 'create_goal': {
        const goal = goalService.add(args.title, {
          areaId: args.areaId,
          targetDate: args.targetDate,
          priority: args.priority,
          description: args.description,
        });
        return { success: true, message: `Created goal "${goal.title}" (${goal.id})`, data: goal };
      }
      case 'edit_goal': {
        const updates: Record<string, unknown> = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.areaId !== undefined) updates.areaId = args.areaId || null;
        if (args.status !== undefined) updates.status = args.status;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.targetDate !== undefined) updates.targetDate = args.targetDate || null;
        if (args.description !== undefined) updates.description = args.description;
        const goal = goalService.edit(args.id, updates as any);
        return { success: true, message: `Updated goal "${goal.title}"`, data: goal };
      }
      case 'delete_goal': {
        goalService.remove(args.id);
        return { success: true, message: `Deleted goal ${args.id}` };
      }
      case 'set_goal_progress': {
        const goal = goalService.setProgress(args.id, args.progress);
        return { success: true, message: `Set goal "${goal.title}" progress to ${goal.progress}%`, data: goal };
      }

      // Tasks
      case 'list_tasks': {
        const tasks = taskService.list({
          status: args.status,
          priority: args.priority,
          areaId: args.areaId,
          goalId: args.goalId,
        });
        return { success: true, message: `Found ${tasks.length} tasks`, data: tasks };
      }
      case 'create_task': {
        const task = taskService.add(args.title, {
          areaId: args.areaId,
          goalId: args.goalId,
          priority: args.priority,
          dueDate: args.dueDate,
          description: args.description,
        });
        return { success: true, message: `Created task "${task.title}" (${task.id})`, data: task };
      }
      case 'edit_task': {
        const updates: Record<string, unknown> = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.status !== undefined) updates.status = args.status;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.dueDate !== undefined) updates.dueDate = args.dueDate || null;
        if (args.areaId !== undefined) updates.areaId = args.areaId || null;
        if (args.goalId !== undefined) updates.goalId = args.goalId || null;
        if (args.description !== undefined) updates.description = args.description;
        const task = taskService.edit(args.id, updates as any);
        return { success: true, message: `Updated task "${task.title}"`, data: task };
      }
      case 'complete_task': {
        const task = taskService.markDone(args.id);
        return { success: true, message: `Completed task "${task.title}"`, data: task };
      }
      case 'delete_task': {
        taskService.remove(args.id);
        return { success: true, message: `Deleted task ${args.id}` };
      }

      // Habits
      case 'list_habits': {
        const habits = habitService.list({ areaId: args.areaId, goalId: args.goalId });
        return { success: true, message: `Found ${habits.length} habits`, data: habits };
      }
      case 'create_habit': {
        const habit = habitService.add(args.title, {
          frequency: args.frequency,
          days: args.days,
          areaId: args.areaId,
          goalId: args.goalId,
        });
        return { success: true, message: `Created habit "${habit.title}" (${habit.id})`, data: habit };
      }
      case 'check_habit': {
        const completion = habitService.check(args.id, args.date);
        return { success: true, message: `Checked habit for ${completion.date}`, data: completion };
      }
      case 'uncheck_habit': {
        habitService.uncheck(args.id, args.date);
        return { success: true, message: `Unchecked habit for ${args.date || 'today'}` };
      }
      case 'delete_habit': {
        habitService.remove(args.id);
        return { success: true, message: `Deleted habit ${args.id}` };
      }

      // Milestones
      case 'add_milestone': {
        const ms = goalService.addMilestone(args.goalId, args.title);
        return { success: true, message: `Added milestone "${ms.title}" (${ms.id})`, data: ms };
      }
      case 'toggle_milestone': {
        const ms = goalService.toggleMilestone(args.id);
        return { success: true, message: `Milestone "${ms.title}" is now ${ms.done ? 'done' : 'not done'}`, data: ms };
      }

      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, message };
  }
}

function readDocument(filePath: string): ToolResult {
  if (!filePath) {
    return { success: false, message: 'File path is required' };
  }

  const resolved = resolve(filePath);
  const ext = extname(resolved).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      success: false,
      message: `Unsupported file type "${ext}". Supported: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
    };
  }

  if (!existsSync(resolved)) {
    return { success: false, message: `File not found: ${resolved}` };
  }

  let content = readFileSync(resolved, 'utf-8');
  let truncated = false;

  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH);
    truncated = true;
  }

  const message = truncated
    ? `Read ${MAX_CONTENT_LENGTH.toLocaleString()} characters from ${resolved} (truncated — file is larger)`
    : `Read ${content.length.toLocaleString()} characters from ${resolved}`;

  return { success: true, message, data: content };
}
