import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, X, Pencil } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useScheduleStore } from '@/store/scheduleStore';

interface DraftWorker {
  name: string;
  shortName: string;
  position: string;
}

const emptyDraft: DraftWorker = { name: '', shortName: '', position: '' };

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

  const sorted = [...workerOptions].sort((a, b) =>
    a.shortName.localeCompare(b.shortName, 'ru')
  );

  const handleAdd = async () => {
    const shortName = draft.shortName.trim();
    if (!shortName) return;
    const name = draft.name.trim() || shortName;
    const position = draft.position.trim() || null;
    await createWorkerOption({ name, shortName, position });
    setDraft(emptyDraft);
  };

  const startEdit = (id: string) => {
    const w = workerOptions.find(x => x.id === id);
    if (!w) return;
    setEditingId(id);
    setEditDraft({ name: w.name, shortName: w.shortName, position: w.position ?? '' });
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
    });
    cancelEdit();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <h3 className="font-semibold text-sm">Добавить работника</h3>
          <p className="text-xs text-muted-foreground">
            Сокращение появится в выпадающих списках в редакторе расписания (например: ПГ, Ф, о.А)
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div>
              <Label className="text-xs text-muted-foreground">Сокращение *</Label>
              <Input
                value={draft.shortName}
                onChange={e => setDraft({ ...draft, shortName: e.target.value })}
                placeholder="ПГ"
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Имя</Label>
              <Input
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder="Полина Г."
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Должность</Label>
              <Input
                value={draft.position}
                onChange={e => setDraft({ ...draft, position: e.target.value })}
                placeholder="пекарь"
                className="h-8 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
            </div>
            <Button onClick={handleAdd} disabled={!draft.shortName.trim()} className="h-8">
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
            <ul className="divide-y">
              {sorted.map(w => {
                const isEditing = editingId === w.id;
                if (isEditing) {
                  return (
                    <li key={w.id} className="py-2">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                        <Input
                          value={editDraft.shortName}
                          onChange={e => setEditDraft({ ...editDraft, shortName: e.target.value })}
                          placeholder="Сокращение"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editDraft.name}
                          onChange={e => setEditDraft({ ...editDraft, name: e.target.value })}
                          placeholder="Имя"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editDraft.position}
                          onChange={e => setEditDraft({ ...editDraft, position: e.target.value })}
                          placeholder="Должность"
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-1">
                          <Button onClick={saveEdit} size="sm" className="h-8 flex-1">
                            <Save className="h-3 w-3 mr-1" /> Сохранить
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" size="sm" className="h-8">
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={w.id} className="py-2 flex items-center gap-3">
                    <span className="font-mono font-semibold text-sm w-16">{w.shortName}</span>
                    <span className="text-sm flex-1">
                      {w.name}
                      {w.position && (
                        <span className="ml-2 text-xs text-muted-foreground">· {w.position}</span>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(w.id)}
                      className="h-7 w-7"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWorkerOption(w.id)}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
