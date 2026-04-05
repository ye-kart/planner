import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpaces, useCreateSpace, useUpdateSpace, useDeleteSpace } from '../hooks/use-api';
import { useKeyboardStore } from '../stores/keyboard.store';
import { InlineForm } from '../components/shared/inline-form';
import { ConfirmDialog } from '../components/shared/confirm-dialog';
import type { Space } from '../api/types';

export function SpacesPage() {
  const { data: spaces, isLoading } = useSpaces();
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const navigate = useNavigate();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { inputFocused, overlayOpen } = useKeyboardStore();

  useEffect(() => {
    document.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (inputFocused || overlayOpen) return;
      if (!spaces) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          setSelectedIdx((i) => Math.min(i + 1, spaces.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          setSelectedIdx((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          if (spaces[selectedIdx]) navigate(`/spaces/${spaces[selectedIdx].id}`);
          break;
        case 'n':
          setShowAdd(true);
          break;
        case 'e':
          if (spaces[selectedIdx]) setEditId(spaces[selectedIdx].id);
          break;
        case 'x':
          if (spaces[selectedIdx]) setDeleteId(spaces[selectedIdx].id);
          break;
        case 'Escape':
          navigate(-1);
          break;
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inputFocused, overlayOpen, spaces, selectedIdx, navigate]);

  if (isLoading) return <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-secondary)] p-8">Loading...</div>;

  const editingSpace = editId ? spaces?.find((s) => s.id === editId) : null;
  const deletingSpace = deleteId ? spaces?.find((s) => s.id === deleteId) : null;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4 min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)]"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text-accent)]">Manage Spaces</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 text-sm rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90"
        >
          + New Space
        </button>
      </div>

      <InlineForm
        open={showAdd}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'icon', label: 'Icon (emoji)' },
          { name: 'description', label: 'Description' },
        ]}
        onSubmit={(vals) => {
          createSpace.mutate({ name: vals.name, icon: vals.icon || undefined, description: vals.description || undefined });
          setShowAdd(false);
        }}
        onCancel={() => setShowAdd(false)}
        submitLabel="Create"
      />

      {editId && editingSpace && (
        <InlineForm
          open
          initialValues={{
            name: editingSpace.name,
            icon: editingSpace.icon ?? '',
            description: editingSpace.description ?? '',
          }}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'icon', label: 'Icon (emoji)' },
            { name: 'description', label: 'Description' },
          ]}
          onSubmit={(vals) => {
            updateSpace.mutate({ id: editId, name: vals.name, icon: vals.icon || undefined, description: vals.description || undefined });
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      <div className="space-y-1">
        {spaces?.map((space, i) => (
          <div
            key={space.id}
            data-selected={i === selectedIdx ? '' : undefined}
            className={`w-full text-left px-4 py-3 rounded flex items-center justify-between transition-colors ${
              i === selectedIdx
                ? 'bg-[var(--color-bg-highlight)] border border-[var(--color-border-active)]'
                : 'hover:bg-[var(--color-bg-highlight)] border border-transparent'
            }`}
          >
            <button
              onClick={() => navigate(`/spaces/${space.id}`)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <span className="text-xl">{space.icon ?? '📁'}</span>
              <div>
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{space.name}</span>
                {space.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{space.description}</p>
                )}
              </div>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setEditId(space.id)}
                className="px-2 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-accent)] hover:border-[var(--color-border-active)]"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteId(space.id)}
                className="px-2 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--color-text-secondary)] pt-2">
        j/k navigate &middot; Enter to open &middot; n new &middot; e edit &middot; x delete
      </p>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Space"
        message={deletingSpace
          ? `Delete "${deletingSpace.name}"? All areas, goals, tasks, and habits in this space will be permanently deleted.`
          : ''}
        onConfirm={() => {
          if (deleteId) deleteSpace.mutate(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
