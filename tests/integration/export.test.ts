import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb } from './helpers/db.js';
import { AreaRepository } from '../../src/repositories/area.repository.js';
import { GoalRepository } from '../../src/repositories/goal.repository.js';
import { MilestoneRepository } from '../../src/repositories/milestone.repository.js';
import { TaskRepository } from '../../src/repositories/task.repository.js';
import { HabitRepository } from '../../src/repositories/habit.repository.js';
import { CompletionRepository } from '../../src/repositories/completion.repository.js';
import { AreaService } from '../../src/services/area.service.js';
import { GoalService } from '../../src/services/goal.service.js';
import { TaskService } from '../../src/services/task.service.js';
import { HabitService } from '../../src/services/habit.service.js';
import { ContextService } from '../../src/services/context.service.js';
import { ExportService } from '../../src/services/export.service.js';
import type { DB } from '../../src/db/connection.js';

let db: DB;
let areaService: AreaService;
let goalService: GoalService;
let taskService: TaskService;
let habitService: HabitService;
let exportService: ExportService;

beforeEach(() => {
  db = createTestDb();
  const areaRepo = new AreaRepository(db);
  const goalRepo = new GoalRepository(db);
  const milestoneRepo = new MilestoneRepository(db);
  const taskRepo = new TaskRepository(db);
  const habitRepo = new HabitRepository(db);
  const completionRepo = new CompletionRepository(db);
  areaService = new AreaService(areaRepo, goalRepo, taskRepo, habitRepo);
  goalService = new GoalService(goalRepo, milestoneRepo, areaRepo, taskRepo, habitRepo);
  taskService = new TaskService(taskRepo, areaRepo, goalRepo);
  habitService = new HabitService(habitRepo, completionRepo, areaRepo, goalRepo);
  const contextService = new ContextService(areaRepo, goalRepo, milestoneRepo, taskRepo, habitRepo, completionRepo);
  exportService = new ExportService(contextService);
});

describe('ExportService', () => {
  it('generates markdown with header and export date', () => {
    const md = exportService.generateMarkdown();
    expect(md).toContain('# Planner Export');
    expect(md).toContain('> Exported on');
  });

  it('includes area sections with descriptions', () => {
    areaService.add('Health', 'Physical wellness');
    const md = exportService.generateMarkdown();
    expect(md).toContain('## Health');
    expect(md).toContain('> Physical wellness');
  });

  it('renders goals with metadata table', () => {
    const area = areaService.add('Career');
    goalService.add('Get promoted', { areaId: area.id, priority: 'high', targetDate: '2026-12-31' });
    const md = exportService.generateMarkdown();
    expect(md).toContain('#### Get promoted');
    expect(md).toContain('| Status | Progress | Priority | Target |');
    expect(md).toContain('active');
    expect(md).toContain('high');
    expect(md).toContain('2026-12-31');
  });

  it('renders milestones as checkboxes', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Run marathon', { areaId: area.id });
    goalService.addMilestone(goal.id, 'Run 5K');
    const ms2 = goalService.addMilestone(goal.id, 'Run 10K');
    goalService.toggleMilestone(ms2.id);

    const md = exportService.generateMarkdown();
    expect(md).toContain('**Milestones**');
    expect(md).toContain('- [ ] Run 5K');
    expect(md).toContain('- [x] Run 10K');
  });

  it('renders tasks with checkbox, priority, and due date', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Run marathon', { areaId: area.id });
    taskService.add('Buy shoes', { goalId: goal.id, areaId: area.id, priority: 'high', dueDate: '2026-03-01' });
    const doneTask = taskService.add('Register', { goalId: goal.id, areaId: area.id });
    taskService.markDone(doneTask.id);

    const md = exportService.generateMarkdown();
    expect(md).toContain('- [ ] **high** Buy shoes — due 2026-03-01');
    expect(md).toContain('- [x] **medium** Register');
  });

  it('renders in-progress tasks with marker', () => {
    const task = taskService.add('Working on it');
    taskService.start(task.id);

    const md = exportService.generateMarkdown();
    expect(md).toContain('*(in progress)*');
  });

  it('renders habits with frequency and streaks', () => {
    const area = areaService.add('Health');
    habitService.add('Morning run', { areaId: area.id, frequency: 'daily' });

    const md = exportService.generateMarkdown();
    expect(md).toContain('- Morning run (daily) — streak: 0');
  });

  it('renders specific_days habits with day names', () => {
    habitService.add('Gym', { frequency: 'specific_days', days: [1, 3, 5] });

    const md = exportService.generateMarkdown();
    expect(md).toContain('Mon, Wed, Fri');
  });

  it('renders unlinked items in separate section', () => {
    taskService.add('Floating task');
    habitService.add('Floating habit');

    const md = exportService.generateMarkdown();
    expect(md).toContain('## Unlinked');
    expect(md).toContain('Floating task');
    expect(md).toContain('Floating habit');
  });

  it('renders unlinked goals', () => {
    goalService.add('Solo goal');

    const md = exportService.generateMarkdown();
    expect(md).toContain('## Unlinked');
    expect(md).toContain('#### Solo goal');
  });

  it('does not render unlinked section when all items are linked', () => {
    const area = areaService.add('Work');
    taskService.add('Linked task', { areaId: area.id });

    const md = exportService.generateMarkdown();
    expect(md).not.toContain('## Unlinked');
  });

  it('renders progress bar in goal table', () => {
    const area = areaService.add('Health');
    const goal = goalService.add('Goal', { areaId: area.id });
    goalService.addMilestone(goal.id, 'Step 1');
    const ms2 = goalService.addMilestone(goal.id, 'Step 2');
    goalService.toggleMilestone(ms2.id);

    const md = exportService.generateMarkdown();
    // 50% progress = 5 filled + 5 empty blocks
    expect(md).toContain('50%');
  });

  it('renders full hierarchical structure correctly', () => {
    const area = areaService.add('Health', 'Stay fit');
    const goal = goalService.add('Run marathon', { areaId: area.id, priority: 'high' });
    goalService.addMilestone(goal.id, 'Run 10K');
    taskService.add('Buy shoes', { goalId: goal.id, areaId: area.id });
    habitService.add('Morning jog', { goalId: goal.id, areaId: area.id });
    taskService.add('Area task', { areaId: area.id });
    taskService.add('Unlinked task');

    const md = exportService.generateMarkdown();

    // Verify hierarchy: Area → Goal → Milestones/Tasks/Habits → Area tasks → Unlinked
    const areaPos = md.indexOf('## Health');
    const goalPos = md.indexOf('#### Run marathon');
    const msPos = md.indexOf('Run 10K');
    const goalTaskPos = md.indexOf('Buy shoes');
    const areaTaskPos = md.indexOf('Area task');
    const unlinkedPos = md.indexOf('## Unlinked');
    const unlinkedTaskPos = md.indexOf('Unlinked task');

    expect(areaPos).toBeLessThan(goalPos);
    expect(goalPos).toBeLessThan(msPos);
    expect(msPos).toBeLessThan(goalTaskPos);
    expect(areaPos).toBeLessThan(areaTaskPos);
    expect(unlinkedPos).toBeLessThan(unlinkedTaskPos);
  });
});
