import React, { useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Package, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScheduleBlockCard } from './ScheduleBlockCard';
import { useScheduleStore } from '@/store/scheduleStore';

const RU_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });

function dayOfWeekFromDate(date: string): string {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const raw = RU_WEEKDAY_FORMATTER.format(d);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWorkday(date: string, direction: 1 | -1): string {
  let next = shiftDate(date, direction);
  // Skip Saturday (day 6)
  const d = new Date(next + 'T00:00:00');
  if (d.getDay() === 6) next = shiftDate(next, direction);
  return next;
}

export const ScheduleEditor: React.FC = () => {
  const {
    schedule,
    updateDate,
    updateDayOfWeek,
    addBlock,
    addAssemblyBlock,
    reorderBlocks,
  } = useScheduleStore();

  const computedDayOfWeek = dayOfWeekFromDate(schedule.date);

  // Keep stored dayOfWeek in sync with the date in case an older record had a stale value.
  useEffect(() => {
    if (computedDayOfWeek && schedule.dayOfWeek !== computedDayOfWeek) {
      updateDayOfWeek(computedDayOfWeek);
    }
  }, [computedDayOfWeek, schedule.dayOfWeek, updateDayOfWeek]);

  const navigateDay = useCallback((direction: 1 | -1) => {
    const next = nextWorkday(schedule.date, direction);
    updateDate(next);
    const dow = dayOfWeekFromDate(next);
    if (dow) updateDayOfWeek(dow);
  }, [schedule.date, updateDate, updateDayOfWeek]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = schedule.blocks.findIndex(b => b.id === active.id);
      const newIndex = schedule.blocks.findIndex(b => b.id === over.id);
      reorderBlocks(oldIndex, newIndex);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        addBlock();
      }
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        addAssemblyBlock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addBlock, addAssemblyBlock]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Date & Day Header */}
      <div className="flex items-end gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50 border flex-wrap">
        <Button
          onClick={() => navigateDay(-1)}
          variant="outline"
          size="icon"
          className="h-11 sm:h-10 w-11 sm:w-10 shrink-0"
          aria-label="Предыдущий день"
          title="Предыдущий день"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1.5">
          <Label htmlFor="schedule-date" className="text-xs text-muted-foreground">Дата</Label>
          <Input
            id="schedule-date"
            type="date"
            value={schedule.date}
            onChange={e => {
              updateDate(e.target.value);
              const next = dayOfWeekFromDate(e.target.value);
              if (next) updateDayOfWeek(next);
            }}
            className="h-11 sm:h-10 text-base sm:text-sm w-full sm:w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">День недели</Label>
          <div
            className="inline-flex h-11 sm:h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-base sm:text-sm text-foreground"
            aria-live="polite"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {computedDayOfWeek || schedule.dayOfWeek || '—'}
            </span>
          </div>
        </div>
        <Button
          onClick={() => navigateDay(1)}
          variant="outline"
          size="icon"
          className="h-11 sm:h-10 w-11 sm:w-10 shrink-0"
          aria-label="Следующий день"
          title="Следующий день"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Blocks */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={schedule.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {schedule.blocks.map(block => (
            <ScheduleBlockCard key={block.id} block={block} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add Block Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={addBlock} variant="outline" className="flex-1 h-11">
          <Plus className="h-4 w-4 mr-2" />
          Добавить блок
          <span className="hidden md:inline ml-2 text-xs text-muted-foreground">(Ctrl+B)</span>
        </Button>
        <Button onClick={addAssemblyBlock} variant="outline" className="flex-1 h-11">
          <Package className="h-4 w-4 mr-2" />
          Добавить сборку
          <span className="hidden md:inline ml-2 text-xs text-muted-foreground">(Ctrl+M)</span>
        </Button>
      </div>
    </div>
  );
};
