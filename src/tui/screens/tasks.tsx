import { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { PriorityBadge } from '../components/priority-badge.js';
import { StatusBadge } from '../components/status-badge.js';
import { ListNavigator } from '../components/list-navigator.js';
import { useAnimation } from '../hooks/use-animation.js';
import type { Task } from '../../db/schema.js';

interface TasksScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
}

type Filter = 'all' | 'todo' | 'in_progress' | 'done';

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

export function TasksScreen({ refreshKey, refresh, searchQuery }: TasksScreenProps) {
  const { colors } = useTheme();
  const { taskService } = useServices();

  const [filter, setFilter] = useState<Filter>('all');
  const getTasks = (): Task[] => {
    try {
      const filters = filter === 'all' ? undefined : { status: filter };
      return taskService.list(filters);
    } catch { return []; }
  };
  const [tasks, setTasks] = useState<Task[]>(getTasks);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTasks(getTasks());
  }, [refreshKey, filter]);

  const filtered = tasks.filter(t =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = useCallback((key: string, task: Task) => {
    try {
      if (key === 'd' && task.status !== 'done') {
        taskService.markDone(task.id);
        setMessage(`Marked "${task.title}" done`);
        refresh();
      } else if (key === 's' && task.status === 'todo') {
        taskService.start(task.id);
        setMessage(`Started "${task.title}"`);
        refresh();
      } else if (key === 'f') {
        const filters: Filter[] = ['all', 'todo', 'in_progress', 'done'];
        setFilter(prev => {
          const idx = filters.indexOf(prev);
          return filters[(idx + 1) % filters.length]!;
        });
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
    }
  }, [taskService, refresh]);

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title={`📋 Tasks [filter: ${filter}]`}>
        <ListNavigator
          items={filtered}
          emptyMessage="No tasks found"
          onAction={handleAction}
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
            <Text color={colors.success}>{message}</Text>
          </Box>
        )}
        <Box marginTop={1} gap={2}>
          <Text color={colors.textSecondary} italic>d:done s:start f:filter</Text>
        </Box>
      </Panel>
    </Box>
  );
}
