import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildTimeOptions, normalizeTime } from '@/lib/time-utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Used to anchor the ±1 hour quick options when the field is empty. */
  defaultTime: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export const TimePicker: React.FC<Props> = ({
  value,
  onChange,
  defaultTime,
  placeholder = '—',
  className,
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const display = value ? normalizeTime(value) : '';
  const baseTime = value || defaultTime;
  const options = buildTimeOptions(baseTime);

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

  const pick = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ariaLabel ?? 'Выбрать время'}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-base sm:text-sm shadow-sm transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'hover:bg-accent hover:text-accent-foreground',
          !display && 'text-muted-foreground'
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left tabular-nums">
          {display || placeholder}
        </span>
      </button>
      {open && options.length > 0 && (
        <div
          role="listbox"
          aria-label="Варианты времени"
          className="absolute z-50 mt-1 w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {options.map(opt => {
            const isCurrent = opt === display;
            const isDefault = opt === normalizeTime(defaultTime);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                role="option"
                aria-selected={isCurrent}
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded px-3 text-base sm:text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isCurrent && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <span className="tabular-nums">{opt}</span>
                {isDefault && !isCurrent && (
                  <span className="text-xs text-muted-foreground">по умолч.</span>
                )}
                {isDefault && isCurrent && (
                  <span className="text-xs opacity-80">по умолч.</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
