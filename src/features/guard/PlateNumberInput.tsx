import { useEffect, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { normalizePlateInput } from './plate';

interface PlateNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  error?: string;
}

export function PlateNumberInput({ value, onChange, autoFocus = false, error }: PlateNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <FormField label="Plate number" htmlFor="plate" error={error}>
      <Input
        ref={inputRef}
        id="plate"
        value={value}
        onChange={(event) => onChange(normalizePlateInput(event.target.value))}
        placeholder="ABC 1234"
        autoCapitalize="characters"
        autoComplete="off"
        inputMode="text"
        className="h-16 text-2xl font-bold tracking-wide"
        required
      />
      <p className="text-sm text-slate-500">Spaces and hyphens are normalized automatically.</p>
      {value.trim() && (
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          Formatted plate: {value.trim()}
        </p>
      )}
    </FormField>
  );
}
