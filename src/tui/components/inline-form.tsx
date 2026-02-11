import { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useTheme } from '../hooks/use-theme.js';
import { Panel } from './panel.js';
import { HintBar } from './hint-bar.js';

export interface FormFieldDef {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  required?: boolean;
  options?: string[];       // for select fields
  placeholder?: string;
}

interface InlineFormProps {
  title: string;
  fields: FormFieldDef[];
  initialValues?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  setInputActive: (active: boolean) => void;
}

export function InlineForm({
  title,
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  setInputActive,
}: InlineFormProps) {
  const { colors } = useTheme();
  const [focusIndex, setFocusIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = initialValues[f.key] ?? '';
    }
    return init;
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setInputActive(true);
    return () => setInputActive(false);
  }, [setInputActive]);

  const currentField = fields[focusIndex]!;

  const setValue = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = useCallback(() => {
    // Validate required fields
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        setError(`${f.label} is required`);
        setFocusIndex(fields.indexOf(f));
        return;
      }
    }
    // Validate date fields
    for (const f of fields) {
      if (f.type === 'date' && values[f.key]?.trim()) {
        const v = values[f.key]!.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          setError(`${f.label} must be YYYY-MM-DD`);
          setFocusIndex(fields.indexOf(f));
          return;
        }
      }
    }
    setError('');
    onSubmit(values);
  }, [fields, values, onSubmit]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Tab / Shift+Tab navigation
    if (key.tab) {
      if (key.shift) {
        setFocusIndex(i => (i - 1 + fields.length) % fields.length);
      } else {
        setFocusIndex(i => (i + 1) % fields.length);
      }
      setError('');
      return;
    }

    // Select field: arrows and space cycle options
    if (currentField.type === 'select' && currentField.options) {
      const opts = currentField.options;
      const curVal = values[currentField.key] || opts[0]!;
      const idx = opts.indexOf(curVal);

      if (key.leftArrow) {
        setValue(currentField.key, opts[(idx - 1 + opts.length) % opts.length]!);
        return;
      }
      if (key.rightArrow || input === ' ') {
        setValue(currentField.key, opts[(idx + 1) % opts.length]!);
        return;
      }
    }

    // Enter on any field = submit
    if (key.return && currentField.type !== 'text' && currentField.type !== 'date') {
      handleSubmit();
    }
  });

  const hints = currentField.type === 'select'
    ? ['<< >>:cycle', 'Tab:next', 'Enter:save', 'Esc:cancel']
    : ['Enter:save', 'Tab:next', 'Esc:cancel'];

  return (
    <Box flexDirection="column" gap={1}>
      <Panel title={title}>
        <Box flexDirection="column" gap={0}>
          {fields.map((field, i) => {
            const focused = i === focusIndex;
            const val = values[field.key] || '';

            return (
              <Box key={field.key} gap={1}>
                <Text
                  color={focused ? colors.accent1 : colors.textSecondary}
                  bold={focused}
                >
                  {field.label}:{field.required ? '*' : ' '}
                </Text>

                {field.type === 'select' && field.options ? (
                  <Box gap={1}>
                    {focused && <Text color={colors.accent2}>{'<'}</Text>}
                    {field.options.map(opt => (
                      <Text
                        key={opt}
                        color={(val || field.options![0]) === opt
                          ? (focused ? colors.textAccent : colors.textPrimary)
                          : colors.textSecondary}
                        bold={(val || field.options![0]) === opt}
                        underline={(val || field.options![0]) === opt && focused}
                      >
                        {opt}
                      </Text>
                    ))}
                    {focused && <Text color={colors.accent2}>{'>'}</Text>}
                  </Box>
                ) : focused ? (
                  <Box borderStyle="round" borderColor={colors.borderActive} paddingX={1}>
                    <TextInput
                      value={val}
                      onChange={v => setValue(field.key, v)}
                      onSubmit={handleSubmit}
                      placeholder={field.placeholder || (field.type === 'date' ? 'YYYY-MM-DD' : '')}
                    />
                  </Box>
                ) : (
                  <Text color={val ? colors.textPrimary : colors.textSecondary}>
                    {val || field.placeholder || (field.type === 'date' ? 'YYYY-MM-DD' : '—')}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>

        {error && (
          <Box marginTop={1}>
            <Text color={colors.error}>{error}</Text>
          </Box>
        )}

        <HintBar hints={hints} />
      </Panel>
    </Box>
  );
}
