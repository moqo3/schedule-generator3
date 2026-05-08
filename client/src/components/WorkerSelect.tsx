import React from 'react';
import { useScheduleStore } from '@/store/scheduleStore';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  exclude?: string[];
}

export const WorkerSelect: React.FC<Props> = ({ value, onChange, placeholder, className, exclude }) => {
  const workerOptions = useScheduleStore(s => s.workerOptions);

  const sorted = [...workerOptions].sort((a, b) =>
    a.shortName.localeCompare(b.shortName, 'ru')
  );

  const excludeSet = new Set(exclude ?? []);
  const filtered = sorted.filter(w => w.shortName === value || !excludeSet.has(w.shortName));

  const valueIsKnown = filtered.some(w => w.shortName === value);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={
        className ??
        'flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
      }
    >
      <option value="">{placeholder ?? '—'}</option>
      {!valueIsKnown && value && (
        <option value={value}>{value} (нет в списке)</option>
      )}
      {filtered.map(w => (
        <option key={w.id} value={w.shortName}>
          {w.shortName}
          {w.name && w.name !== w.shortName ? ` — ${w.name}` : ''}
        </option>
      ))}
    </select>
  );
};
