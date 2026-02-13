import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { PriorityBadge } from '../components/priority-badge.js';
import { StatusBadge } from '../components/status-badge.js';
import { ListNavigator } from '../components/list-navigator.js';
import { InlineForm } from '../components/inline-form.js';
import { HintBar } from '../components/hint-bar.js';
import { useAnimation } from '../hooks/use-animation.js';
import type { FormFieldDef } from '../components/inline-form.js';
import type { Task } from '../../db/schema.js';

interface TasksScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
  setInputActive: (active: boolean) => void;
  chatOpen: boolean;
}

type Filter = 'all' | 'todo' | 'in_progress' | 'done';
const FILTERS: Filter[] = ['all', 'todo', 'in_progress', 'done'];
type Mode = 'list' | 'detail' | 'add' | 'edit';

function OverdueIndicator({ dueDate }: { dueDate: string | null }) {
  const { colors } = useTheme();
  const frame = useAnimation(800);

  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate + 'T00:00:00');
  if (due >= now) return null;

  const days = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const pulse = frame % 2 === 0;

  return (
    <Text color={pulse ? colors.error : colors.warning} bold>
      {days}d overdue
    </Text>
  );
}

export function TasksScreen({ refreshKey, refresh, searchQuery, setInputActive, chatOpen }: TasksScreenProps) {
  const { colors } = useTheme();
  const { taskService, areaService, goalService } = useServices();

  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<Mode>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [message, setMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getTasks = (): Task[] => {
    try {
      const filters = filter === 'all' ? undefined : { status: filter };
      return taskService.list(filters);
    } catch { return []; }
  };
  const [tasks, setTasks] = useState<Task[]>(getTasks);

  useEffect(() => {
    setTasks(getTasks());
  }, [refreshKey, filter]);

  const filtered = tasks.filter(t =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildFormFields = useCallback((forEdit = false): FormFieldDef[] => {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();
    const goals = (() => { try { return goalService.list(); } catch { return []; } })();

    const fields: FormFieldDef[] = [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'optional' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
    ];
    if (forEdit) {
      fields.push({ key: 'status', label: 'Status', type: 'select', options: ['todo', 'in_progress', 'done'] });
    }
    if (areas.length > 0) {
      fields.push({ key: 'area', label: 'Area', type: 'select', options: ['(none)', ...areas.map(a => a.name)] });
    }
    if (goals.length > 0) {
      fields.push({ key: 'goal', label: 'Goal', type: 'select', options: ['(none)', ...goals.map(g => g.title)] });
    }
    fields.push({ key: 'dueDate', label: 'Due Date', type: 'date' });
    return fields;
  }, [areaService, goalService]);

  const resolveAreaId = useCallback((name: string | undefined): string | undefined => {
    if (!name || name === '(none)') return undefined;
    try {
      const areas = areaService.list();
      return areas.find(a => a.name === name)?.id;
    } catch { return undefined; }
  }, [areaService]);

  const resolveGoalId = useCallback((title: string | undefined): string | undefined => {
    if (!title || title === '(none)') return undefined;
    try {
      const goals = goalService.list();
      return goals.find(g => g.title === title)?.id;
    } catch { return undefined; }
  }, [goalService]);

  const handleSelect = useCallback((task: Task) => {
    setSelectedTask(task);
    setMode('detail');
  }, []);

  const handleAction = useCallback((key: string, task: Task) => {
    if (mode !== 'list') return;
    if (key === 'd' && task.status !== 'done') {
      try {
        taskService.markDone(task.id);
        setMessage(`Marked "${task.title}" done`);
        refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error');
      }
    } else if (key === 's' && task.status === 'todo') {
      try {
        taskService.start(task.id);
        setMessage(`Started "${task.title}"`);
        refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error');
      }
    } else if (key === 'e') {
      setSelectedTask(task);
      setMode('edit');
    } else if (key === 'n') {
      setMode('add');
    } else if (key === 'x') {
      if (deleteConfirm === task.id) {
        try {
          taskService.remove(task.id);
          setMessage(`Deleted "${task.title}"`);
          setDeleteConfirm(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
      } else {
        setDeleteConfirm(task.id);
        setMessage(`Press x again to delete "${task.title}"`);
      }
    }
  }, [mode, deleteConfirm, taskService, refresh]);

  const handleCursorChange = useCallback(() => {
    if (deleteConfirm) {
      setDeleteConfirm(null);
      setMessage('');
    }
  }, [deleteConfirm]);

  const handleAddSubmit = useCallback((values: Record<string, string>) => {
    try {
      const title = values['title']!.trim();
      const description = values['description']?.trim() || undefined;
      const priority = values['priority'] || undefined;
      const areaId = resolveAreaId(values['area']);
      const goalId = resolveGoalId(values['goal']);
      const dueDate = values['dueDate']?.trim() || undefined;
      taskService.add(title, { description, priority, areaId, goalId, dueDate });
      setMessage(`Added "${title}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [taskService, refresh, resolveAreaId, resolveGoalId]);

  const handleEditSubmit = useCallback((values: Record<string, string>) => {
    if (!selectedTask) return;
    try {
      const updates: Record<string, string | null | undefined> = {};
      const title = values['title']?.trim();
      if (title && title !== selectedTask.title) updates.title = title;
      const desc = values['description']?.trim();
      if (desc !== (selectedTask.description || '')) updates.description = desc || null;
      const priority = values['priority'];
      if (priority && priority !== selectedTask.priority) updates.priority = priority;
      const status = values['status'];
      if (status && status !== selectedTask.status) updates.status = status;
      const dueDate = values['dueDate']?.trim();
      if (dueDate !== (selectedTask.dueDate || '')) updates.dueDate = dueDate || null;

      const areaId = resolveAreaId(values['area']);
      if (areaId !== selectedTask.areaId) updates.areaId = areaId ?? null;
      const goalId = resolveGoalId(values['goal']);
      if (goalId !== selectedTask.goalId) updates.goalId = goalId ?? null;

      taskService.edit(selectedTask.id, updates);
      setMessage(`Updated "${title || selectedTask.title}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [selectedTask, taskService, refresh, resolveAreaId, resolveGoalId]);

  const handleCancel = useCallback(() => {
    setMode('list');
    setMessage('');
  }, []);

  // Key handling for detail/list modes
  useInput((input, key) => {
    if (chatOpen || mode === 'add' || mode === 'edit') return;

    if (mode === 'detail' && selectedTask) {
      if (key.backspace || key.delete || key.escape || input === 'h') {
        setMode('list');
        setSelectedTask(null);
        return;
      }
      if (input === 'e') {
        setMode('edit');
        return;
      }
      if (input === 'd' && selectedTask.status !== 'done') {
        try {
          taskService.markDone(selectedTask.id);
          setMessage(`Marked "${selectedTask.title}" done`);
          setMode('list');
          setSelectedTask(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
        return;
      }
      if (input === 's' && selectedTask.status === 'todo') {
        try {
          taskService.start(selectedTask.id);
          setMessage(`Started "${selectedTask.title}"`);
          setMode('list');
          setSelectedTask(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
        return;
      }
      if (input === 'x') {
        if (deleteConfirm === selectedTask.id) {
          try {
            taskService.remove(selectedTask.id);
            setMessage(`Deleted "${selectedTask.title}"`);
            setDeleteConfirm(null);
            setMode('list');
            setSelectedTask(null);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Error');
          }
        } else {
          setDeleteConfirm(selectedTask.id);
          setMessage(`Press x again to delete "${selectedTask.title}"`);
        }
        return;
      }
      return;
    }

    // List mode shortcuts
    if (input === 'n') {
      setMode('add');
    } else if (input === 'f') {
      setFilter(prev => {
        const idx = FILTERS.indexOf(prev);
        return FILTERS[(idx + 1) % FILTERS.length]!;
      });
    } else if (input === 'F') {
      setFilter(prev => {
        const idx = FILTERS.indexOf(prev);
        return FILTERS[(idx - 1 + FILTERS.length) % FILTERS.length]!;
      });
    }
  });

  // ── Add mode ──────────────────────────────────────
  if (mode === 'add') {
    return (
      <InlineForm
        title="+ Add Task"
        fields={buildFormFields(false)}
        onSubmit={handleAddSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Edit mode ──────────────────────────────────────
  if (mode === 'edit' && selectedTask) {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();
    const goals = (() => { try { return goalService.list(); } catch { return []; } })();
    const areaName = areas.find(a => a.id === selectedTask.areaId)?.name || '(none)';
    const goalTitle = goals.find(g => g.id === selectedTask.goalId)?.title || '(none)';

    return (
      <InlineForm
        title={`Edit: ${selectedTask.title}`}
        fields={buildFormFields(true)}
        initialValues={{
          title: selectedTask.title,
          description: selectedTask.description || '',
          priority: selectedTask.priority,
          status: selectedTask.status,
          area: areaName,
          goal: goalTitle,
          dueDate: selectedTask.dueDate || '',
        }}
        onSubmit={handleEditSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Detail view ──────────────────────────────────────
  if (mode === 'detail' && selectedTask) {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();
    const goals = (() => { try { return goalService.list(); } catch { return []; } })();
    const areaName = areas.find(a => a.id === selectedTask.areaId)?.name;
    const goalTitle = goals.find(g => g.id === selectedTask.goalId)?.title;

    const detailHints = ['Bksp:back', 'e:edit', 'x:delete'];
    if (selectedTask.status !== 'done') detailHints.push('d:done');
    if (selectedTask.status === 'todo') detailHints.push('s:start');

    return (
      <Box flexDirection="column" gap={1}>
        <Panel title={`${selectedTask.title}`}>
          <Box flexDirection="column" gap={0}>
            <Box gap={1}>
              <StatusBadge status={selectedTask.status} />
              <PriorityBadge priority={selectedTask.priority} />
            </Box>
            {selectedTask.description && (
              <Text color={colors.textPrimary}>{selectedTask.description}</Text>
            )}
            {selectedTask.dueDate && (
              <Box gap={1}>
                <Text color={colors.textSecondary}>Due:</Text>
                <Text color={colors.textPrimary}>{selectedTask.dueDate}</Text>
                <OverdueIndicator dueDate={selectedTask.dueDate} />
              </Box>
            )}
            {areaName && (
              <Box gap={1}>
                <Text color={colors.textSecondary}>Area:</Text>
                <Text color={colors.textPrimary}>{areaName}</Text>
              </Box>
            )}
            {goalTitle && (
              <Box gap={1}>
                <Text color={colors.textSecondary}>Goal:</Text>
                <Text color={colors.textPrimary}>{goalTitle}</Text>
              </Box>
            )}
            {selectedTask.completedAt && (
              <Box gap={1}>
                <Text color={colors.textSecondary}>Completed:</Text>
                <Text color={colors.success}>{selectedTask.completedAt}</Text>
              </Box>
            )}
          </Box>
        </Panel>

        {message && (
          <Box>
            <Text color={message.startsWith('Press') ? colors.warning : colors.success}>{message}</Text>
          </Box>
        )}
        <HintBar hints={detailHints} />
      </Box>
    );
  }

  // ── List mode ──────────────────────────────────────
  return (
    <Box flexDirection="column" gap={1}>
      <Panel title="Tasks" extra={
        <Box gap={1}>
          <Text color={colors.textSecondary}>f:</Text>
          {FILTERS.map(f => (
            <Text
              key={f}
              color={f === filter ? colors.accent1 : colors.textSecondary}
              bold={f === filter}
              underline={f === filter}
            >
              {f}
            </Text>
          ))}
        </Box>
      }>
        <ListNavigator
          items={filtered}
          active={!chatOpen}
          emptyMessage="No tasks found — press n to add one"
          onSelect={handleSelect}
          onAction={handleAction}
          onCursorChange={handleCursorChange}
          renderItem={(task, _i, selected) => (
            <Box gap={1}>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                bold={selected}
                strikethrough={task.status === 'done'}
              >
                {task.title}
              </Text>
              {task.dueDate && (
                <Text color={colors.textSecondary}>[{task.dueDate}]</Text>
              )}
              <OverdueIndicator dueDate={task.dueDate} />
            </Box>
          )}
        />
        {message && (
          <Box marginTop={1}>
            <Text color={message.startsWith('Press') ? colors.warning
              : message.startsWith('Deleted') || message.startsWith('Added')
                || message.startsWith('Updated') || message.startsWith('Marked')
                || message.startsWith('Started')
                ? colors.success : colors.error}>
              {message}
            </Text>
          </Box>
        )}
        <HintBar hints={['Enter:detail', 'n:add', 'e:edit', 'x:delete', 'd:done', 's:start', 'f/F:filter']} />
      </Panel>
    </Box>
  );
}
