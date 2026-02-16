import { useState, useRef, useEffect } from 'react';
import { useKeyboardStore } from '../../stores/keyboard.store';

interface InlineFormProps {
  open: boolean;
  initialValues?: Record<string, string>;
  fields: Array<{ name: string; label: string; type?: string; required?: boolean }>;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function InlineForm({ open, initialValues = {}, fields, onSubmit, onCancel, submitLabel = 'Save' }: InlineFormProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const setInputFocused = useKeyboardStore((s) => s.setInputFocused);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border-active)] bg-[var(--color-bg-panel)] p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
        className="space-y-3"
      >
        {fields.map((field, i) => (
          <div key={field.name}>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{field.label}</label>
            <input
              ref={i === 0 ? firstInputRef : undefined}
              type={field.type ?? 'text'}
              value={values[field.name] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              required={field.required}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              className="w-full px-3 py-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-border-active)]"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-highlight)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
