import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] p-0 backdrop:bg-black/50"
      onClose={onCancel}
    >
      <div className="p-6 min-w-80">
        <h3 className="text-lg font-semibold text-[var(--color-text-accent)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-highlight)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded bg-[var(--color-error)] text-white hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}
