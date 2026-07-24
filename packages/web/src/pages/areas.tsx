import { useState, useEffect } from 'react';
import { useAreas, useArea, useCreateArea, useUpdateArea, useDeleteArea } from '../hooks/use-api';
import { useKeyboardStore } from '../stores/keyboard.store';
import { Panel } from '../components/shared/panel';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';

export function AreasPage() {
  const { data: areas, isLoading } = useAreas();
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: detail } = useArea(detailId ?? '');
  const { inputFocused, overlayOpen } = useKeyboardStore();

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!areas) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          setSelectedIdx((i) => Math.min(i + 1, areas.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          setSelectedIdx(0);
          break;
        case 'End':
          setSelectedIdx(areas.length - 1);
          break;
        case 'Enter':
          if (areas[selectedIdx]) setDetailId(areas[selectedIdx].id);
          break;
        case 'Backspace':
          setDetailId(null);
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'e':
          if (areas[selectedIdx]) setEditId(areas[selectedIdx].id);
          break;
        case 'x':
          if (areas[selectedIdx]) setDeleteId(areas[selectedIdx].id);
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inputFocused, overlayOpen, areas, selectedIdx]);

  if (isLoading) return <div className="text-[var(--color-text-secondary)]">Loading...</div>;

  if (detailId && detail) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setDetailId(null)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">{detail.name}</h1>
        </div>
        {detail.description && <p className="text-sm text-[var(--color-text-secondary)]">{detail.description}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Panel title={`Goals (${detail.goals.length})`}>
            {detail.goals.map((g) => (
              <div key={g.id} className="py-1 text-sm text-[var(--color-text-primary)]">{g.title}</div>
            ))}
            {detail.goals.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">None</p>}
          </Panel>
          <Panel title={`Tasks (${detail.tasks.length})`}>
            {detail.tasks.map((t) => (
              <div key={t.id} className="py-1 text-sm text-[var(--color-text-primary)]">{t.title}</div>
            ))}
            {detail.tasks.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">None</p>}
          </Panel>
          <Panel title={`Habits (${detail.habits.length})`}>
            {detail.habits.map((h) => (
              <div key={h.id} className="py-1 text-sm text-[var(--color-text-primary)]">{h.title}</div>
            ))}
            {detail.habits.length === 0 && <p className="text-xs text-[var(--color-text-secondary)]">None</p>}
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Areas</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90 active:opacity-80 transition-opacity"
        >
          + New Area
        </button>
      </div>

      <InlineForm
        open={showAdd}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'description', label: 'Description' },
        ]}
        onSubmit={(vals) => {
          createArea.mutate({ name: vals.name, description: vals.description || undefined });
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      {editId && (
        <InlineForm
          open
          initialValues={{
            name: areas?.find((a) => a.id === editId)?.name ?? '',
            description: areas?.find((a) => a.id === editId)?.description ?? '',
          }}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'description', label: 'Description' },
          ]}
          onSubmit={(vals) => {
            updateArea.mutate({ id: editId, name: vals.name, description: vals.description || undefined });
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      <div className="space-y-2">
        {areas?.map((area, i) => (
          <div
            key={area.id}
            role="button"
            tabIndex={0}
            onClick={() => setDetailId(area.id)}
            onKeyDown={(e) => {
              // Only when the row itself is focused — Enter on an inner Edit/
              // Delete button must not also open the detail view. Stop
              // propagation so the page-level Enter handler (which acts on the
              // j/k selection, possibly a different row) doesn't double-fire.
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setDetailId(area.id);
              }
            }}
            data-selected={i === selectedIdx ? '' : undefined}
            className={`w-full text-left px-4 py-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-1.5 transition-colors cursor-pointer ${
              i === selectedIdx
                ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]'
                : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
            }`}
          >
            <div className="min-w-0">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{area.name}</span>
              {area.description && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 truncate">{area.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 md:gap-4 shrink-0">
              <div className="flex gap-3 md:gap-4 text-xs text-[var(--color-text-secondary)]">
                <span>{area.goalCount} goal{area.goalCount === 1 ? '' : 's'}</span>
                <span>{area.taskCount} task{area.taskCount === 1 ? '' : 's'}</span>
                <span>{area.habitCount} habit{area.habitCount === 1 ? '' : 's'}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(area.id); }}
                  className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:border-[var(--color-border-active)] transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(area.id); }}
                  className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {areas?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">#</p>
            <p className="text-sm text-[var(--color-text-secondary)]">No areas yet — press n to create one</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Area"
        message="Children (goals, tasks, habits) will be unlinked, not deleted."
        onConfirm={() => {
          if (deleteId) deleteArea.mutate(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
