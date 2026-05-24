import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScheduleStore } from '@/store/scheduleStore';

function priorityMarker(score: number): string {
  if (score >= 80) return '🟢 ';
  if (score >= 50) return '🟡 ';
  if (score >= 20) return '⚪ ';
  return '';
}

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** When provided, workers are sorted by this function (desc) instead of alphabetically. */
  priorityFn?: (shortName: string) => number;
}

export const WorkerMultiSelect: React.FC<Props> = ({ values, onChange, placeholder, priorityFn }) => {
  const workerOptions = useScheduleStore(s => s.workerOptions);

  const visible = [...workerOptions].filter(w => !w.shortName.startsWith('__'));

  const sorted = priorityFn
    ? visible.sort((a, b) => {
        const pa = priorityFn(a.shortName);
        const pb = priorityFn(b.shortName);
        if (pa !== pb) return pb - pa;
        return a.shortName.localeCompare(b.shortName, 'ru');
      })
    : visible.sort((a, b) => a.shortName.localeCompare(b.shortName, 'ru'));

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
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[40px] rounded-md border border-input bg-background px-2 py-1.5">
        {values.length === 0 && (
          <span className="text-sm text-muted-foreground">{placeholder ?? 'Никого не выбрано'}</span>
        )}
        {values.map((name, idx) => (
          <span
            key={`${name}-${idx}`}
            className="inline-flex items-center gap-1 rounded bg-orange-100 text-orange-900 text-sm px-2 py-1"
          >
            {name}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(idx)}
              className="h-6 w-6 hover:bg-orange-200 text-orange-900"
              aria-label={`Убрать ${name}`}
            >
              <X className="h-3.5 w-3.5" />
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
        className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-base sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">+ Добавить работника…</option>
        {sorted.map(w => {
          const marker = priorityFn ? priorityMarker(priorityFn(w.shortName)) : '';
          return (
            <option key={w.id} value={w.shortName}>
              {marker}{w.shortName}
              {w.name && w.name !== w.shortName ? ` — ${w.name}` : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
};
