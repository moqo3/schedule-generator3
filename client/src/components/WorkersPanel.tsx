import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, X, Pencil } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useScheduleStore } from '@/store/scheduleStore';
import type { DefaultPositions, ShiftPositions } from '@/types/schedule';
import { isDayAwarePositions, DAYS_OF_WEEK } from '@/types/schedule';

type ShiftKey = '1' | '2' | '3' | '4';
const SHIFTS: ShiftKey[] = ['1', '2', '3', '4'];
const DAY_SHORT: Record<string, string> = {
  'Понедельник': 'Пн', 'Вторник': 'Вт', 'Среда': 'Ср',
  'Четверг': 'Чт', 'Пятница': 'Пт', 'Суббота': 'Сб', 'Воскресенье': 'Вс',
};

interface DraftWorker {
  name: string;
  shortName: string;
  position: string;
  /** Per-shift position string (raw input). Empty string = unassigned. */
  defaults: Record<ShiftKey, string>;
}

const emptyDraft: DraftWorker = {
  name: '',
  shortName: '',
  position: '',
  defaults: { '1': '', '2': '', '3': '', '4': '' },
};

function parsePosition(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function buildDefaultPositions(d: Record<ShiftKey, string>): ShiftPositions | null {
  const out: ShiftPositions = {};
  for (const k of SHIFTS) {
    const n = parsePosition(d[k]);
    if (n !== null) out[k] = n;
  }
  return Object.keys(out).length === 0 ? null : out;
}

function defaultsFromOption(dp: DefaultPositions | null): Record<ShiftKey, string> {
  if (!dp) return { '1': '', '2': '', '3': '', '4': '' };
  // Day-aware: can't represent in simple shift inputs, just return empty
  if (isDayAwarePositions(dp)) return { '1': '', '2': '', '3': '', '4': '' };
  const sp = dp as ShiftPositions;
  return {
    '1': sp['1'] ? String(sp['1']) : '',
    '2': sp['2'] ? String(sp['2']) : '',
    '3': sp['3'] ? String(sp['3']) : '',
    '4': sp['4'] ? String(sp['4']) : '',
  };
}

export const WorkersPanel: React.FC = () => {
  const {
    workerOptions,
    loadWorkerOptions,
    createWorkerOption,
    updateWorkerOption,
    deleteWorkerOption,
  } = useScheduleStore();

  const [draft, setDraft] = useState<DraftWorker>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftWorker>(emptyDraft);

  useEffect(() => {
    loadWorkerOptions();
  }, [loadWorkerOptions]);

  const sorted = [...workerOptions]
    .filter(w => !w.shortName.startsWith('__'))
    .sort((a, b) => a.shortName.localeCompare(b.shortName, 'ru'));

  const handleAdd = async () => {
    const shortName = draft.shortName.trim();
    if (!shortName) return;
    const name = draft.name.trim() || shortName;
    const position = draft.position.trim() || null;
    await createWorkerOption({
      name,
      shortName,
      position,
      defaultPositions: buildDefaultPositions(draft.defaults),
    });
    setDraft(emptyDraft);
  };

  const startEdit = (id: string) => {
    const w = workerOptions.find(x => x.id === id);
    if (!w) return;
    setEditingId(id);
    setEditDraft({
      name: w.name,
      shortName: w.shortName,
      position: w.position ?? '',
      defaults: defaultsFromOption(w.defaultPositions),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const shortName = editDraft.shortName.trim();
    if (!shortName) return;
    await updateWorkerOption(editingId, {
      name: editDraft.name.trim() || shortName,
      shortName,
      position: editDraft.position.trim() || null,
      defaultPositions: buildDefaultPositions(editDraft.defaults),
    });
    cancelEdit();
  };

  const renderShiftInputs = (
    values: Record<ShiftKey, string>,
    onChange: (next: Record<ShiftKey, string>) => void,
  ) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        Позиция в смене (по умолчанию)
      </Label>
      <div className="grid grid-cols-4 gap-1.5">
        {SHIFTS.map(k => (
          <div key={k} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-3 shrink-0">{k}</span>
            <Input
              value={values[k]}
              onChange={e => onChange({ ...values, [k]: e.target.value })}
              placeholder="—"
              inputMode="numeric"
              pattern="[0-9]*"
              className="h-10 text-base sm:text-sm tabular-nums px-2"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderShiftBadges = (dp: DefaultPositions | null) => {
    if (!dp) return null;
    if (isDayAwarePositions(dp)) {
      // Day-aware: show compact day breakdown
      const dayEntries = DAYS_OF_WEEK
        .filter(day => dp[day] && Object.keys(dp[day]).length > 0)
        .map(day => {
          const shifts = dp[day] as ShiftPositions;
          const parts = SHIFTS.filter(k => shifts[k]).map(k => `${k}/п${shifts[k]}`);
          return `${DAY_SHORT[day]}(${parts.join(',')})`;
        });
      if (dayEntries.length === 0) return null;
      return (
        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
          · {dayEntries.join(' ')}
        </span>
      );
    }
    // Legacy format
    const sp = dp as ShiftPositions;
    const items = SHIFTS.filter(k => sp[k]).map(k => `${k}/${sp[k]}`);
    if (items.length === 0) return null;
    return (
      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
        · смена/поз: {items.join(', ')}
      </span>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">Добавить работника</h3>
          <p className="text-xs text-muted-foreground">
            Сокращение появится в выпадающих списках в редакторе расписания (например: ПГ, Ф, о.А).
            «Позиция в смене» — куда работник встанет в разделке этой смены при создании нового расписания.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Сокращение *</Label>
              <Input
                value={draft.shortName}
                onChange={e => setDraft({ ...draft, shortName: e.target.value })}
                placeholder="ПГ"
                className="h-10 text-base sm:text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Имя</Label>
              <Input
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder="Полина Г."
                className="h-10 text-base sm:text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">Должность</Label>
              <Input
                value={draft.position}
                onChange={e => setDraft({ ...draft, position: e.target.value })}
                placeholder="пекарь"
                className="h-10 text-base sm:text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              {renderShiftInputs(draft.defaults, next =>
                setDraft({ ...draft, defaults: next })
              )}
            </div>
            <Button
              onClick={handleAdd}
              disabled={!draft.shortName.trim()}
              className="h-10 col-span-2 sm:col-span-4"
            >
              <Plus className="h-4 w-4 mr-1" /> Добавить
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">
            Работники {sorted.length > 0 && <span className="text-muted-foreground">· {sorted.length}</span>}
          </h3>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Список пуст. Добавьте работников выше — после этого их можно будет выбирать в редакторе.
            </p>
          ) : (
            <ul className="divide-y -mx-3 sm:mx-0">
              {sorted.map(w => {
                const isEditing = editingId === w.id;
                if (isEditing) {
                  return (
                    <li key={w.id} className="py-3 px-3 sm:px-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                        <Input
                          value={editDraft.shortName}
                          onChange={e => setEditDraft({ ...editDraft, shortName: e.target.value })}
                          placeholder="Сокращение"
                          className="h-10 text-base sm:text-sm"
                        />
                        <Input
                          value={editDraft.name}
                          onChange={e => setEditDraft({ ...editDraft, name: e.target.value })}
                          placeholder="Имя"
                          className="h-10 text-base sm:text-sm"
                        />
                        <Input
                          value={editDraft.position}
                          onChange={e => setEditDraft({ ...editDraft, position: e.target.value })}
                          placeholder="Должность"
                          className="h-10 text-base sm:text-sm col-span-2 sm:col-span-1"
                        />
                        <div className="col-span-2 sm:col-span-1">
                          {renderShiftInputs(editDraft.defaults, next =>
                            setEditDraft({ ...editDraft, defaults: next })
                          )}
                        </div>
                        <div className="flex gap-1 col-span-2 sm:col-span-4">
                          <Button onClick={saveEdit} size="sm" className="h-10 flex-1">
                            <Save className="h-4 w-4 mr-1" /> Сохранить
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" size="sm" className="h-10 w-10 p-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={w.id} className="py-2.5 px-3 sm:px-0 flex items-center gap-2 sm:gap-3">
                    <span className="font-mono font-semibold text-sm w-12 sm:w-16 shrink-0">{w.shortName}</span>
                    <span className="text-sm flex-1 min-w-0 truncate">
                      <span className="truncate">{w.name}</span>
                      {w.position && (
                        <span className="ml-2 text-xs text-muted-foreground">· {w.position}</span>
                      )}
                      {renderShiftBadges(w.defaultPositions)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(w.id)}
                      className="h-9 w-9 shrink-0"
                      aria-label="Изменить"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWorkerOption(w.id)}
                      className="h-9 w-9 shrink-0 text-destructive"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
