import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScheduleStore } from '@/store/scheduleStore';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export const WorkerMultiSelect: React.FC<Props> = ({ values, onChange, placeholder }) => {
  const workerOptions = useScheduleStore(s => s.workerOptions);

  const sorted = [...workerOptions].sort((a, b) =>
    a.shortName.localeCompare(b.shortName, 'ru')
  );

  const remove = (idx: number) => {
    const next = values.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const add = (shortName: string) => {
    if (!shortName) return;
    onChange([...values, shortName]);
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1 min-h-[32px] rounded-md border border-input bg-background px-2 py-1">
        {values.length === 0 && (
          <span className="text-sm text-muted-foreground">{placeholder ?? 'Никого не выбрано'}</span>
        )}
        {values.map((name, idx) => (
          <span
            key={`${name}-${idx}`}
            className="inline-flex items-center gap-1 rounded bg-orange-100 text-orange-900 text-xs px-2 py-0.5"
          >
            {name}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(idx)}
              className="h-4 w-4 hover:bg-orange-200 text-orange-900"
            >
              <X className="h-3 w-3" />
            </Button>
          </span>
        ))}
      </div>
      <select
        value=""
        onChange={e => {
          add(e.target.value);
          e.target.value = '';
        }}
        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">+ Добавить работника…</option>
        {sorted.map(w => (
          <option key={w.id} value={w.shortName}>
            {w.shortName}
            {w.name && w.name !== w.shortName ? ` — ${w.name}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
