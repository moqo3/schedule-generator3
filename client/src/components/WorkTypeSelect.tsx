import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const WORK_TYPE_FIXED = ['Служебные', 'Мелкие'] as const;
export const WORK_TYPE_OTHER = 'Другой' as const;
export type FixedWorkType = (typeof WORK_TYPE_FIXED)[number];

export type WorkTypeMode = FixedWorkType | typeof WORK_TYPE_OTHER;

export function getWorkTypeMode(value: string): WorkTypeMode {
  return (WORK_TYPE_FIXED as readonly string[]).includes(value)
    ? (value as FixedWorkType)
    : WORK_TYPE_OTHER;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const WorkTypeSelect: React.FC<Props> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const mode = getWorkTypeMode(value);
  const isOther = mode === WORK_TYPE_OTHER;
  const customText = isOther ? value : '';

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const pickFixed = (opt: FixedWorkType) => {
    onChange(opt);
    setOpen(false);
  };

  const pickOther = () => {
    if (!isOther) onChange('');
    setOpen(false);
  };

  const buttonLabel = isOther ? WORK_TYPE_OTHER : mode;

  return (
    <div className={cn('space-y-2', className)}>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-base sm:text-sm shadow-sm transition-colors',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <span>{buttonLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
        {open && (
          <div
            role="listbox"
            aria-label="Тип работы"
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {WORK_TYPE_FIXED.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => pickFixed(opt)}
                role="option"
                aria-selected={opt === value}
                className={cn(
                  'flex h-10 w-full items-center rounded px-3 text-base sm:text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  opt === value && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              onClick={pickOther}
              role="option"
              aria-selected={isOther}
              className={cn(
                'flex h-10 w-full items-center rounded px-3 text-base sm:text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isOther && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {WORK_TYPE_OTHER}
            </button>
          </div>
        )}
      </div>
      {isOther && (
        <Input
          value={customText}
          onChange={e => onChange(e.target.value)}
          placeholder="Например: уборка территории"
          className="h-10 text-base sm:text-sm"
          aria-label="Описание работы"
        />
      )}
    </div>
  );
};
