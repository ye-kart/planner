import { useState, useRef, useEffect } from 'react';
import { useKeyboardStore } from '../../stores/keyboard.store';

interface FieldOption {
  value: string;
  label: string;
}

interface Field {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
}

interface InlineFormProps {
  open: boolean;
  initialValues?: Record<string, string>;
  fields: Field[];
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitLabel?: string;
}

type FirstFieldEl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function InlineForm({ open, initialValues = {}, fields, onSubmit, onCancel, submitLabel = 'Save' }: InlineFormProps) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const firstFieldRef = useRef<FirstFieldEl>(null);
  const setInputFocused = useKeyboardStore((s) => s.setInputFocused);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
    return () => setInputFocused(false);
  }, [open, setInputFocused]);

  if (!open) return null;

  const fieldClass =
    'w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-border-active)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-active)] transition-colors';

  return (
    <div className="rounded-lg border border-[var(--color-border-active)] bg-[var(--color-bg-panel)] p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        className="space-y-3"
      >
        {fields.map((field, i) => {
          const value = values[field.name] ?? '';
          const onChange = (v: string) => setValues((prev) => ({ ...prev, [field.name]: v }));
          return (
            <div key={field.name}>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  ref={i === 0 ? (firstFieldRef as React.RefObject<HTMLSelectElement>) : undefined}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required={field.required}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className={fieldClass}
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  ref={i === 0 ? (firstFieldRef as React.RefObject<HTMLTextAreaElement>) : undefined}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required={field.required}
                  rows={3}
                  placeholder={field.placeholder}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className={`${fieldClass} resize-none`}
                />
              ) : (
                <input
                  ref={i === 0 ? (firstFieldRef as React.RefObject<HTMLInputElement>) : undefined}
                  type={field.type ?? 'text'}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className={fieldClass}
                />
              )}
            </div>
          );
        })}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-highlight)] active:opacity-80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent-1)] text-[var(--color-bg)] font-medium hover:opacity-90 active:opacity-80 transition-opacity"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
