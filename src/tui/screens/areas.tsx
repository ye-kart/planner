import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/use-theme.js';
import { useServices } from '../hooks/use-services.js';
import { Panel } from '../components/panel.js';
import { ListNavigator } from '../components/list-navigator.js';
import { InlineForm } from '../components/inline-form.js';
import { HintBar } from '../components/hint-bar.js';
import type { FormFieldDef } from '../components/inline-form.js';
import type { AreaWithStats, AreaDetail } from '../../services/area.service.js';

interface AreasScreenProps {
  refreshKey: number;
  refresh: () => void;
  searchQuery: string;
  setInputActive: (active: boolean) => void;
}

type Mode = 'list' | 'detail' | 'add' | 'edit';

const areaFields: FormFieldDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'optional' },
];

export function AreasScreen({ refreshKey, refresh, searchQuery, setInputActive }: AreasScreenProps) {
  const { colors } = useTheme();
  const { areaService } = useServices();

  const getAreas = (): AreaWithStats[] => {
    try { return areaService.list(); } catch { return []; }
  };
  const [areas, setAreas] = useState<AreaWithStats[]>(getAreas);
  const [detail, setDetail] = useState<AreaDetail | null>(null);
  const [mode, setMode] = useState<Mode>('list');
  const [selectedArea, setSelectedArea] = useState<AreaWithStats | null>(null);
  const [message, setMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setAreas(getAreas());
  }, [refreshKey]);

  const filtered = areas.filter(a =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback((area: AreaWithStats) => {
    try {
      setDetail(areaService.show(area.id));
      setSelectedArea(area);
      setMode('detail');
    } catch {
      // ignore
    }
  }, [areaService]);

  const handleAction = useCallback((key: string, area: AreaWithStats) => {
    if (mode !== 'list') return;
    if (key === 'e') {
      setSelectedArea(area);
      setMode('edit');
    } else if (key === 'n') {
      setMode('add');
    } else if (key === 'x') {
      if (deleteConfirm === area.id) {
        try {
          areaService.remove(area.id);
          setMessage(`Deleted "${area.name}"`);
          setDeleteConfirm(null);
          refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : 'Error');
        }
      } else {
        setDeleteConfirm(area.id);
        setMessage(`Press x again to delete "${area.name}"`);
      }
    }
  }, [mode, deleteConfirm, areaService, refresh]);

  const handleCursorChange = useCallback(() => {
    if (deleteConfirm) {
      setDeleteConfirm(null);
      setMessage('');
    }
  }, [deleteConfirm]);

  const handleAddSubmit = useCallback((values: Record<string, string>) => {
    try {
      const name = values['name']!.trim();
      const desc = values['description']?.trim() || undefined;
      areaService.add(name, desc);
      setMessage(`Added "${name}"`);
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [areaService, refresh]);

  const handleEditSubmit = useCallback((values: Record<string, string>) => {
    if (!selectedArea) return;
    try {
      const updates: { name?: string; description?: string } = {};
      const name = values['name']?.trim();
      const desc = values['description']?.trim();
      if (name && name !== selectedArea.name) updates.name = name;
      if (desc !== (selectedArea.description || '')) {
        updates.description = desc || undefined;
      }
      if (Object.keys(updates).length > 0) {
        areaService.edit(selectedArea.id, updates);
        setMessage(`Updated "${name || selectedArea.name}"`);
      }
      setMode('list');
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error');
      setMode('list');
    }
  }, [selectedArea, areaService, refresh]);

  const handleCancel = useCallback(() => {
    setMode('list');
    setMessage('');
  }, []);

  // Global keys for this screen
  useInput((input, key) => {
    if (mode === 'add' || mode === 'edit') return;

    if (mode === 'detail') {
      if (key.backspace || key.delete || key.escape || input === 'h') {
        setMode('list');
        setDetail(null);
        return;
      }
      if (input === 'e' && detail) {
        // Find the area in the list for editing
        const area = areas.find(a => a.id === detail.id);
        if (area) {
          setSelectedArea(area);
          setMode('edit');
        }
        return;
      }
      if (input === 'x' && detail) {
        if (deleteConfirm === detail.id) {
          try {
            areaService.remove(detail.id);
            setMessage(`Deleted "${detail.name}"`);
            setDeleteConfirm(null);
            setMode('list');
            setDetail(null);
            refresh();
          } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Error');
          }
        } else {
          setDeleteConfirm(detail.id);
          setMessage(`Press x again to delete "${detail.name}"`);
        }
        return;
      }
      return;
    }

    // List mode: 'n' to add
    if (input === 'n') {
      setMode('add');
    }
  });

  // ── Add mode ──────────────────────────────────────
  if (mode === 'add') {
    return (
      <InlineForm
        title="+ Add Area"
        fields={areaFields}
        onSubmit={handleAddSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Edit mode ──────────────────────────────────────
  if (mode === 'edit' && selectedArea) {
    const initial: Record<string, string> = {
      name: selectedArea.name,
      description: selectedArea.description || '',
    };
    return (
      <InlineForm
        title={`Edit: ${selectedArea.name}`}
        fields={areaFields}
        initialValues={initial}
        onSubmit={handleEditSubmit}
        onCancel={handleCancel}
        setInputActive={setInputActive}
      />
    );
  }

  // ── Detail view ──────────────────────────────────────
  if (mode === 'detail' && detail) {
    return (
      <Box flexDirection="column" gap={1}>
        <Panel title={`${detail.name}`}>
          {detail.description && (
            <Text color={colors.textPrimary}>{detail.description}</Text>
          )}
        </Panel>

        {detail.goals.length > 0 && (
          <Panel title="Goals">
            {detail.goals.map(g => (
              <Box key={g.id} gap={1}>
                <Text color={g.status === 'done' ? colors.success : colors.textPrimary}>
                  {g.status === 'done' ? '●' : g.status === 'active' ? '◑' : '◌'}
                </Text>
                <Text color={colors.textPrimary}>{g.title}</Text>
                <Text color={colors.textSecondary}>{g.progress}%</Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.tasks.length > 0 && (
          <Panel title="Tasks">
            {detail.tasks.map(t => (
              <Box key={t.id} gap={1}>
                <Text color={colors.textSecondary}>
                  {t.status === 'done' ? '●' : t.status === 'in_progress' ? '◑' : '○'}
                </Text>
                <Text
                  color={colors.textPrimary}
                  strikethrough={t.status === 'done'}
                >
                  {t.title}
                </Text>
              </Box>
            ))}
          </Panel>
        )}

        {detail.habits.length > 0 && (
          <Panel title="Habits">
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
            <Text color={message.startsWith('Press') ? colors.warning : colors.success}>{message}</Text>
          </Box>
        )}
        <HintBar hints={['Bksp:back', 'e:edit', 'x:delete']} />
      </Box>
    );
  }

  // ── List mode ──────────────────────────────────────
  return (
    <Box flexDirection="column" gap={1}>
      <Panel title="Areas">
        <ListNavigator
          items={filtered}
          emptyMessage="No areas found — press n to add one"
          onSelect={handleSelect}
          onAction={handleAction}
          onCursorChange={handleCursorChange}
          renderItem={(area, _i, selected) => (
            <Box gap={1}>
              <Text
                color={selected ? colors.textAccent : colors.textPrimary}
                bold={selected}
              >
                {area.name}
              </Text>
              <Text color={colors.textSecondary}>
                {area.goalCount}g {area.taskCount}t {area.habitCount}h
              </Text>
            </Box>
          )}
        />
        {message && (
          <Box marginTop={1}>
            <Text color={message.startsWith('Press') ? colors.warning
              : message.startsWith('Deleted') || message.startsWith('Added') || message.startsWith('Updated')
                ? colors.success : colors.error}>
              {message}
            </Text>
          </Box>
        )}
        <HintBar hints={['Enter:detail', 'n:add', 'e:edit', 'x:delete']} />
      </Panel>
    </Box>
  );
}
