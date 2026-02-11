import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { PriorityBadge } from '../components/priority-badge.js';
import { ProgressBar } from '../components/progress-bar.js';
import { ListNavigator } from '../components/list-navigator.js';
import { InlineForm } from '../components/inline-form.js';
import { HintBar } from '../components/hint-bar.js';
import type { FormFieldDef } from '../components/inline-form.js';
import type { Goal, Milestone } from '../../db/schema.js';
import type { GoalDetail } from '../../services/goal.service.js';

interface GoalsScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
  setInputActive: (active: boolean) => void;
}

type Filter = 'active' | 'done' | 'archived' | 'all';
type Mode = 'list' | 'detail' | 'add' | 'edit';
type DetailAction = null | 'progress' | 'add-milestone';

const FILTERS: Filter[] = ['active', 'done', 'archived', 'all'];

export function GoalsScreen({ refreshKey, refresh, searchQuery, setInputActive }: GoalsScreenProps) {
  const { colors } = useTheme();
  const { goalService, areaService } = useServices();

  const [filter, setFilter] = useState<Filter>('active');
  const [mode, setMode] = useState<Mode>('list');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [message, setMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Detail sub-actions
  const [detailAction, setDetailAction] = useState<DetailAction>(null);
  const [progressInput, setProgressInput] = useState('');
  const [milestoneInput, setMilestoneInput] = useState('');
  // Milestone delete confirm
  const [msDeleteConfirm, setMsDeleteConfirm] = useState<string | null>(null);

  const getGoals = (): Goal[] => {
    try {
      if (filter === 'all') return goalService.list();
      return goalService.list({ status: filter });
    } catch { return []; }
  };
  const [goals, setGoals] = useState<Goal[]>(getGoals);

  useEffect(() => {
    setGoals(getGoals());
  }, [refreshKey, filter]);

  const filtered = goals.filter(g =>
    !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildFormFields = useCallback((forEdit = false): FormFieldDef[] => {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();

    const fields: FormFieldDef[] = [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'optional' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
    ];
    if (forEdit) {
      fields.push({ key: 'status', label: 'Status', type: 'select', options: ['active', 'done', 'archived'] });
    }
    if (areas.length > 0) {
      fields.push({ key: 'area', label: 'Area', type: 'select', options: ['(none)', ...areas.map(a => a.name)] });
    }
    fields.push({ key: 'targetDate', label: 'Target Date', type: 'date' });
    return fields;
  }, [areaService]);

  const resolveAreaId = useCallback((name: string | undefined): string | undefined => {
    if (!name || name === '(none)') return undefined;
    try {
      const areas = areaService.list();
      return areas.find(a => a.name === name)?.id;
    } catch { return undefined; }
  }, [areaService]);

  const refreshDetail = useCallback((goalId: string) => {
    try {
      setDetail(goalService.show(goalId));
    } catch {
      // goal may have been deleted
    }
  }, [goalService]);

  const handleSelect = useCallback((goal: Goal) => {
    try {
      setDetail(goalService.show(goal.id));
      setSelectedGoal(goal);
      setMode('detail');
    } catch {
      // ignore
    }
  }, [goalService]);

  const handleAction = useCallback((key: string, goal: Goal) => {
    if (mode !== 'list') return;
    if (key === 'e') {
      setSelectedGoal(goal);
      setMode('edit');
    } else if (key === 'n') {
      setMode('add');
    } else if (key === 'f') {
      setFilter(prev => {
        const idx = FILTERS.indexOf(prev);
        return FILTERS[(idx + 1) % FILTERS.length]!;
      });
    } else if (key === 'x') {
      if (deleteConfirm === goal.id) {
        try {
          goalService.remove(goal.id);
          setMessage(`Deleted "${goal.title}"`);
          setDeleteConfirm(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
      } else {
        setDeleteConfirm(goal.id);
        setMessage(`Press x again to delete "${goal.title}"`);
      }
    }
  }, [mode, deleteConfirm, goalService, refresh]);

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
      const targetDate = values['targetDate']?.trim() || undefined;
      goalService.add(title, { description, priority, areaId, targetDate });
      setMessage(`Added "${title}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [goalService, refresh, resolveAreaId]);

  const handleEditSubmit = useCallback((values: Record<string, string>) => {
    if (!selectedGoal) return;
    try {
      const updates: Record<string, string | null | undefined> = {};
      const title = values['title']?.trim();
      if (title && title !== selectedGoal.title) updates.title = title;
      const desc = values['description']?.trim();
      if (desc !== (selectedGoal.description || '')) updates.description = desc || null;
      const priority = values['priority'];
      if (priority && priority !== selectedGoal.priority) updates.priority = priority;
      const status = values['status'];
      if (status && status !== selectedGoal.status) updates.status = status;
      const targetDate = values['targetDate']?.trim();
      if (targetDate !== (selectedGoal.targetDate || '')) updates.targetDate = targetDate || null;
      const areaId = resolveAreaId(values['area']);
      if (areaId !== selectedGoal.areaId) updates.areaId = areaId ?? null;

      goalService.edit(selectedGoal.id, updates);
      setMessage(`Updated "${title || selectedGoal.title}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [selectedGoal, goalService, refresh, resolveAreaId]);

  const handleCancel = useCallback(() => {
    setMode('list');
    setDetailAction(null);
    setMessage('');
  }, []);

  // Key handling for detail and list modes
  useInput((input, key) => {
    if (mode === 'add' || mode === 'edit') return;

    // Progress input mode
    if (detailAction === 'progress') {
      if (key.escape) {
        setDetailAction(null);
        setInputActive(false);
        return;
      }
      if (key.return) {
        const val = parseInt(progressInput, 10);
        if (!isNaN(val) && val >= 0 && val <= 100 && detail) {
          try {
            goalService.setProgress(detail.id, val);
            setMessage(`Progress set to ${val}%`);
            refreshDetail(detail.id);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Error');
          }
        } else {
          setMessage('Progress must be 0-100');
        }
        setDetailAction(null);
        setInputActive(false);
        return;
      }
      return;
    }

    // Milestone input mode
    if (detailAction === 'add-milestone') {
      if (key.escape) {
        setDetailAction(null);
        setInputActive(false);
        return;
      }
      if (key.return) {
        const title = milestoneInput.trim();
        if (title && detail) {
          try {
            goalService.addMilestone(detail.id, title);
            setMessage(`Added milestone "${title}"`);
            refreshDetail(detail.id);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Error');
          }
        }
        setDetailAction(null);
        setInputActive(false);
        return;
      }
      return;
    }

    if (mode === 'detail' && detail) {
      if (key.backspace || key.delete || key.escape || input === 'h') {
        setMode('list');
        setDetail(null);
        setMsDeleteConfirm(null);
        return;
      }
      if (input === 'e') {
        const goal = goals.find(g => g.id === detail.id);
        if (goal) {
          setSelectedGoal(goal);
          setMode('edit');
        }
        return;
      }
      if (input === 'd' && detail.status === 'active') {
        try {
          goalService.markDone(detail.id);
          setMessage(`Marked "${detail.title}" done`);
          setMode('list');
          setDetail(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
        return;
      }
      if (input === 'a' && detail.status === 'active') {
        try {
          goalService.archive(detail.id);
          setMessage(`Archived "${detail.title}"`);
          setMode('list');
          setDetail(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
        return;
      }
      if (input === 'p') {
        setProgressInput(String(detail.progress));
        setDetailAction('progress');
        setInputActive(true);
        return;
      }
      if (input === 'n') {
        setMilestoneInput('');
        setDetailAction('add-milestone');
        setInputActive(true);
        return;
      }
      if (input === 'x') {
        if (deleteConfirm === detail.id) {
          try {
            goalService.remove(detail.id);
            setMessage(`Deleted "${detail.title}"`);
            setDeleteConfirm(null);
            setMode('list');
            setDetail(null);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Error');
          }
        } else {
          setDeleteConfirm(detail.id);
          setMessage(`Press x again to delete "${detail.title}"`);
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
    }
  });

  // ── Add mode ──────────────────────────────────────
  if (mode === 'add') {
    return (
      <InlineForm
        title="+ Add Goal"
        fields={buildFormFields(false)}
        onSubmit={handleAddSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Edit mode ──────────────────────────────────────
  if (mode === 'edit' && selectedGoal) {
    const areas = (() => { try { return areaService.list(); } catch { return []; } })();
    const areaName = areas.find(a => a.id === selectedGoal.areaId)?.name || '(none)';

    return (
      <InlineForm
        title={`Edit: ${selectedGoal.title}`}
        fields={buildFormFields(true)}
        initialValues={{
          title: selectedGoal.title,
          description: selectedGoal.description || '',
          priority: selectedGoal.priority,
          status: selectedGoal.status,
          area: areaName,
          targetDate: selectedGoal.targetDate || '',
        }}
        onSubmit={handleEditSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Detail view ──────────────────────────────────────
  if (mode === 'detail' && detail) {
    const detailHints: string[] = ['Bksp:back', 'e:edit', 'x:delete'];
    if (detail.status === 'active') {
      detailHints.push('d:done', 'a:archive', 'p:progress');
    }
    detailHints.push('n:milestone');

    return (
      <Box flexDirection="column" gap={1}>
        <Panel title={`${detail.title}`}>
          <Box gap={1}>
            <PriorityBadge priority={detail.priority} />
            <Text color={colors.textSecondary}>
              {detail.status} {detail.targetDate ? `| target: ${detail.targetDate}` : ''}
            </Text>
          </Box>
          {detail.description && (
            <Text color={colors.textPrimary}>{detail.description}</Text>
          )}
          {detail.area && (
            <Box gap={1}>
              <Text color={colors.textSecondary}>Area:</Text>
              <Text color={colors.textPrimary}>{detail.area.name}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <ProgressBar value={detail.progress} width={30} />
          </Box>

          {/* Progress input */}
          {detailAction === 'progress' && (
            <Box marginTop={1} gap={1}>
              <Text color={colors.accent1} bold>Progress (0-100):</Text>
              <Box borderStyle="round" borderColor={colors.borderActive} paddingX={1}>
                <TextInput
                  value={progressInput}
                  onChange={setProgressInput}
                />
              </Box>
              <Text color={colors.textSecondary}>Enter:save Esc:cancel</Text>
            </Box>
          )}
        </Panel>

        {/* Milestones */}
        <Panel title={`Milestones (${detail.milestones.filter(m => m.done).length}/${detail.milestones.length})`}>
          {detail.milestones.length === 0 && !detailAction ? (
            <Text color={colors.textSecondary} italic>No milestones — press n to add</Text>
          ) : (
            <MilestoneList
              milestones={detail.milestones}
              goalService={goalService}
              goalId={detail.id}
              onRefresh={() => { refreshDetail(detail.id); refresh(); }}
              onMessage={setMessage}
              active={detailAction === null}
              msDeleteConfirm={msDeleteConfirm}
              setMsDeleteConfirm={setMsDeleteConfirm}
            />
          )}
          {detailAction === 'add-milestone' && (
            <Box marginTop={1} gap={1}>
              <Text color={colors.accent1} bold>New milestone:</Text>
              <Box borderStyle="round" borderColor={colors.borderActive} paddingX={1}>
                <TextInput
                  value={milestoneInput}
                  onChange={setMilestoneInput}
                />
              </Box>
              <Text color={colors.textSecondary}>Enter:save Esc:cancel</Text>
            </Box>
          )}
        </Panel>

        {detail.tasks.length > 0 && (
          <Panel title="Linked Tasks">
            {detail.tasks.map(t => (
              <Box key={t.id} gap={1}>
                <Text color={colors.textSecondary}>
                  {t.status === 'done' ? '●' : t.status === 'in_progress' ? '◑' : '○'}
                </Text>
                <Text color={colors.textPrimary}>{t.title}</Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.habits.length > 0 && (
          <Panel title="Linked Habits">
            {detail.habits.map(h => (
              <Box key={h.id} gap={1}>
                <Text color={colors.textPrimary}>{h.title}</Text>
                <Text color={colors.textSecondary}>streak: {h.currentStreak}d</Text>
              </Box>
            ))}
          </Panel>
        )}

        {message && (
          <Box>
            <Text color={message.startsWith('Press') ? colors.warning
              : message.startsWith('Error') || message.startsWith('Progress must')
                ? colors.error : colors.success}>
              {message}
            </Text>
          </Box>
        )}
        <HintBar hints={detailHints} />
      </Box>
    );
  }

  // ── List mode ──────────────────────────────────────
  return (
    <Box flexDirection="column" gap={1}>
      <Panel title={`Goals [filter: ${filter}]`}>
        <ListNavigator
          items={filtered}
          emptyMessage={`No ${filter === 'all' ? '' : filter + ' '}goals — press n to add one`}
          onSelect={handleSelect}
          onAction={handleAction}
          onCursorChange={handleCursorChange}
          renderItem={(goal, _i, selected) => (
            <Box gap={1}>
              <PriorityBadge priority={goal.priority} />
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                bold={selected}
              >
                {goal.title}
              </Text>
              <ProgressBar value={goal.progress} width={15} animated={false} />
              {goal.targetDate && (
                <Text color={colors.textSecondary}>[{goal.targetDate}]</Text>
              )}
              {goal.status !== 'active' && (
                <Text color={goal.status === 'done' ? colors.success : colors.warning}>
                  [{goal.status}]
                </Text>
              )}
            </Box>
          )}
        />
        {message && (
          <Box marginTop={1}>
            <Text color={message.startsWith('Press') ? colors.warning
              : message.startsWith('Deleted') || message.startsWith('Added')
                || message.startsWith('Updated')
                ? colors.success : colors.error}>
              {message}
            </Text>
          </Box>
        )}
        <HintBar hints={['Enter:detail', 'n:add', 'e:edit', 'x:delete', 'f:filter']} />
      </Panel>
    </Box>
  );
}

// ── Milestone sub-list component ──────────────────
interface MilestoneListProps {
  milestones: Milestone[];
  goalService: { toggleMilestone(id: string): Milestone; removeMilestone(id: string): void };
  goalId: string;
  onRefresh: () => void;
  onMessage: (msg: string) => void;
  active: boolean;
  msDeleteConfirm: string | null;
  setMsDeleteConfirm: (id: string | null) => void;
}

function MilestoneList({
  milestones,
  goalService,
  onRefresh,
  onMessage,
  active,
  msDeleteConfirm,
  setMsDeleteConfirm,
}: MilestoneListProps) {
  const { colors } = useTheme();

  const handleMsSelect = useCallback((ms: Milestone) => {
    try {
      goalService.toggleMilestone(ms.id);
      onMessage(`Toggled "${ms.title}"`);
      onRefresh();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Error');
    }
  }, [goalService, onRefresh, onMessage]);

  const handleMsAction = useCallback((key: string, ms: Milestone) => {
    if (key === ' ') {
      handleMsSelect(ms);
      return;
    }
    if (key === 'x') {
      if (msDeleteConfirm === ms.id) {
        try {
          goalService.removeMilestone(ms.id);
          onMessage(`Removed milestone "${ms.title}"`);
          setMsDeleteConfirm(null);
          onRefresh();
        } catch (err) {
          onMessage(err instanceof Error ? err.message : 'Error');
        }
      } else {
        setMsDeleteConfirm(ms.id);
        onMessage(`Press x again to remove "${ms.title}"`);
      }
    }
  }, [msDeleteConfirm, goalService, onRefresh, onMessage, setMsDeleteConfirm]);

  const handleMsCursorChange = useCallback(() => {
    if (msDeleteConfirm) {
      setMsDeleteConfirm(null);
      onMessage('');
    }
  }, [msDeleteConfirm, setMsDeleteConfirm, onMessage]);

  return (
    <ListNavigator
      items={milestones}
      active={active}
      emptyMessage="No milestones"
      onSelect={handleMsSelect}
      onAction={handleMsAction}
      onCursorChange={handleMsCursorChange}
      renderItem={(ms, _i, selected) => (
        <Box gap={1}>
          <Text color={ms.done ? colors.success : colors.textSecondary}>
            {ms.done ? '●' : '○'}
          </Text>
          <Text
            color={selected ? colors.textAccent : (ms.done ? colors.success : colors.textPrimary)}
            strikethrough={ms.done}
            bold={selected}
          >
            {ms.title}
          </Text>
        </Box>
      )}
    />
  );
}
