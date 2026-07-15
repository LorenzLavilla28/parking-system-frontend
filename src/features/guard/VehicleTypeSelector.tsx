import { cn } from '@/components/ui/cn';
import { VEHICLE_TYPES } from './api';

interface VehicleTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function VehicleTypeSelector({ value, onChange }: VehicleTypeSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">Vehicle type</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {VEHICLE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              'min-h-12 rounded-lg px-3 py-2 text-sm font-semibold ring-1 transition',
              value === type
                ? 'bg-brand-700 text-white ring-brand-700'
                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:text-slate-950',
            )}
            aria-pressed={value === type}
          >
            {type}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
