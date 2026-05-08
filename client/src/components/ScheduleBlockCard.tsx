import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, X } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { WorkerSelect } from './WorkerSelect';
import { WorkerMultiSelect } from './WorkerMultiSelect';
import type { ScheduleBlock } from '@/types/schedule';
import { useScheduleStore } from '@/store/scheduleStore';

interface Props {
  block: ScheduleBlock;
}

export const ScheduleBlockCard: React.FC<Props> = ({ block }) => {
  const { updateBlock, removeBlock, addWorker, removeWorker, updateWorker } = useScheduleStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (block.isAssemblyBlock) {
    return (
      <div ref={setNodeRef} style={style}>
        <Card className="mb-3 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </button>
                <span className="font-semibold text-amber-800">Сборка</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)} className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Работник</Label>
                <WorkerSelect
                  value={block.assemblyWorker}
                  onChange={v => updateBlock(block.id, { assemblyWorker: v })}
                  placeholder="—"
                />
              </div>
              <div className="w-28">
                <Label className="text-xs text-muted-foreground">Время</Label>
                <Input
                  value={block.assemblyTime}
                  onChange={e => updateBlock(block.id, { assemblyTime: e.target.value })}
                  placeholder="14.30"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                <GripVertical className="h-5 w-5" />
              </button>
              <span className="font-semibold text-sm text-muted-foreground">Блок {block.order}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)} className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title & Work Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Название</Label>
              <Input
                value={block.title}
                onChange={e => updateBlock(block.id, { title: e.target.value })}
                placeholder="1 разделка"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Тип работы</Label>
              <Input
                value={block.workType}
                onChange={e => updateBlock(block.id, { workType: e.target.value })}
                placeholder="служебные"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Knead Section */}
          <div className="rounded-md border p-3 bg-blue-50/50">
            <Label className="text-xs font-semibold text-blue-700 mb-2 block">Замес</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Время</Label>
                <Input
                  value={block.kneadTime}
                  onChange={e => updateBlock(block.id, { kneadTime: e.target.value })}
                  placeholder="6.10"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Кол-во</Label>
                <Input
                  value={block.kneadCount}
                  onChange={e => updateBlock(block.id, { kneadCount: e.target.value })}
                  placeholder="5"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Работник</Label>
                <WorkerSelect
                  value={block.kneadWorker}
                  onChange={v => updateBlock(block.id, { kneadWorker: v })}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          {/* Cutting Section */}
          <div className="rounded-md border p-3 bg-green-50/50">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-green-700">Разделка</Label>
              <Button variant="ghost" size="sm" onClick={() => addWorker(block.id)} className="h-6 px-2 text-xs text-green-700">
                <Plus className="h-3 w-3 mr-1" /> Работник
              </Button>
            </div>
            <div className="mb-2">
              <Label className="text-xs text-muted-foreground">Начало</Label>
              <Input
                value={block.cuttingStartTime}
                onChange={e => updateBlock(block.id, { cuttingStartTime: e.target.value })}
                placeholder="8.00"
                className="h-8 text-sm w-32"
              />
            </div>
            <div className="space-y-1">
              {block.cuttingWorkers.map(worker => {
                const others = block.cuttingWorkers
                  .filter(w => w.id !== worker.id)
                  .map(w => w.name)
                  .filter(Boolean);
                return (
                  <div key={worker.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right">{worker.position}</span>
                    <div className="flex-1">
                      <WorkerSelect
                        value={worker.name}
                        onChange={v => updateWorker(block.id, worker.id, { name: v })}
                        placeholder="— Выбрать —"
                        exclude={others}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeWorker(block.id, worker.id)} className="h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Baking Section */}
          <div className="rounded-md border p-3 bg-orange-50/50">
            <Label className="text-xs font-semibold text-orange-700 mb-2 block">Выпечка</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Время</Label>
                <Input
                  value={block.bakingTime}
                  onChange={e => updateBlock(block.id, { bakingTime: e.target.value })}
                  placeholder="10.45"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Работники</Label>
                <WorkerMultiSelect
                  values={block.bakingWorkers}
                  onChange={v => updateBlock(block.id, { bakingWorkers: v })}
                  placeholder="Никого не выбрано"
                />
              </div>
            </div>
          </div>

          {/* Extra Sections */}
          <div>
            <Label className="text-xs text-muted-foreground">Дополнительно</Label>
            <textarea
              value={block.extraSections}
              onChange={e => updateBlock(block.id, { extraSections: e.target.value })}
              placeholder="Доп. секции..."
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
