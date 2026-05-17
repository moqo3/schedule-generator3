import React, { useState } from 'react';
import { BarChart3, UserCheck, FileDown, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useScheduleStore } from '@/store/scheduleStore';
import type { AnalyzeResult, WorkerStats } from '@/types/import';

type Step = 'input' | 'results';

const SHIFT_LABELS: Record<string, string> = { '1': '1 смена', '2': '2 смена', '3': '3 смена', '4': '4 смена' };
const DAY_SHORT: Record<string, string> = {
  'Понедельник': 'Пн', 'Вторник': 'Вт', 'Среда': 'Ср',
  'Четверг': 'Чт', 'Пятница': 'Пт', 'Суббота': 'Сб', 'Воскресенье': 'Вс',
};
const DAY_ORDER = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

function PositionBadges({ positions }: { positions: Record<number, number> }) {
  const entries = Object.entries(positions)
    .map(([p, c]) => ({ pos: Number(p), count: c }))
    .sort((a, b) => b.count - a.count);
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {entries.map(({ pos, count }) => (
        <span
          key={pos}
          className="inline-flex items-center rounded bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 tabular-nums"
        >
          поз.{pos} &times;{count}
        </span>
      ))}
    </span>
  );
}

function WorkerStatsTable({ stats }: { stats: WorkerStats[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="space-y-2">
      {stats.map(s => (
        <Card key={s.workerName} className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">{s.workerName}</span>
            <span className="text-xs text-muted-foreground">({s.totalAppearances} раз в расписаниях)</span>
          </div>
          <div className="space-y-1">
            {Object.entries(s.shifts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([shift, data]) => (
                <div key={shift} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16 shrink-0">{SHIFT_LABELS[shift] ?? `Смена ${shift}`}:</span>
                  <span className="text-xs text-muted-foreground">{data.count}×</span>
                  <PositionBadges positions={data.positions} />
                  <span className="text-xs font-medium text-green-700 ml-auto">
                    → поз.{data.mostFrequentPosition}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export const ImportPanel: React.FC = () => {
  const { loadWorkerOptions, loadSchedules } = useScheduleStore();
  const [step, setStep] = useState<Step>('input');
  const [text, setText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const data = await api.import.analyze(text);
      setResult(data);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка анализа');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyDefaults = async () => {
    if (!result) return;
    setApplying(true);
    setError(null);
    try {
      const data = await api.import.applyDefaults(
        result.suggestedDefaults,
        result.kneadDefaults,
        result.bakingDefaults,
      );
      await loadWorkerOptions();
      setSuccessMessage(
        `Обновлено: ${data.updated.length} работников. Создано: ${data.created.length} новых.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка применения');
    } finally {
      setApplying(false);
    }
  };

  const handleImportSchedules = async () => {
    if (!text.trim()) return;
    setImporting(true);
    setError(null);
    try {
      const data = await api.import.importSchedules(text);
      await loadSchedules();
      setSuccessMessage(`Импортировано ${data.count} расписаний в историю.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setText('');
    setResult(null);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Импорт из Telegram</h3>
        {step === 'results' && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            Новый анализ
          </Button>
        )}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {successMessage}
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Вставьте сообщения из Telegram с расписаниями. Чем больше данных — тем точнее анализ позиций работников.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="import-text" className="text-xs text-muted-foreground">
                  Текст расписаний
                </Label>
                <textarea
                  id="import-text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={'[12.05.2026 10:27] Автор: 13.05 Среда\n1 разделка служебные\n🫗Замес в 6.10 5 Ди.\n🫔Разделка с 8.00\n1⃣Ди2⃣А3⃣о.А4⃣о.Да5⃣СТ\n🥖Выпечка с 10.45 Ф.ПГ\n...'}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[200px] resize-y font-mono"
                  rows={10}
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={!text.trim() || analyzing}
                className="w-full h-11"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                {analyzing ? 'Анализируем…' : 'Анализировать'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'results' && result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="font-semibold text-sm">Результат анализа</h4>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="p-2 rounded bg-blue-50 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.schedulesCount}</div>
                  <div className="text-xs text-muted-foreground">расписаний</div>
                </div>
                <div className="p-2 rounded bg-green-50 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.workerStats.length}</div>
                  <div className="text-xs text-muted-foreground">работников</div>
                </div>
                <div className="p-2 rounded bg-purple-50 text-center">
                  <div className="text-2xl font-bold text-purple-700">{result.totalRecords}</div>
                  <div className="text-xs text-muted-foreground">записей</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Период: {result.dateRange.from} — {result.dateRange.to}
              </p>
            </CardContent>
          </Card>

          {/* Knead & Baking Defaults — Day-aware */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="font-semibold text-sm">Замес и выпечка по дням</h4>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAY_ORDER.filter(day => result.kneadDefaults[day] || result.bakingDefaults[day]).map(day => (
                <div key={day} className="space-y-1">
                  <p className="text-xs font-semibold">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {result.kneadDefaults[day] && Object.entries(result.kneadDefaults[day])
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([shift, worker]) => (
                        <span key={`k-${shift}`} className="inline-flex items-center rounded bg-orange-100 text-orange-800 text-xs px-2 py-1">
                          см.{shift} замес: <span className="font-semibold ml-1">{worker}</span>
                        </span>
                      ))}
                    {result.bakingDefaults[day] && Object.entries(result.bakingDefaults[day])
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([shift, data]) => (
                        <span key={`b-${shift}`} className="inline-flex items-center rounded bg-amber-100 text-amber-800 text-xs px-2 py-1">
                          см.{shift} выпечка: <span className="font-semibold ml-1">{data.senior}</span>
                          {data.junior && <span className="ml-1">+ {data.junior}</span>}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Worker Stats */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Статистика по работникам</h4>
            <WorkerStatsTable stats={result.workerStats} />
          </div>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm">Действия</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleApplyDefaults}
                  disabled={applying}
                  className="flex-1 h-11"
                  variant="default"
                >
                  {applying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4 mr-2" />
                  )}
                  {applying ? 'Применяем…' : 'Применить позиции по умолчанию'}
                </Button>
                <Button
                  onClick={handleImportSchedules}
                  disabled={importing}
                  className="flex-1 h-11"
                  variant="outline"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  {importing ? 'Импортируем…' : 'Импортировать в историю'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                «Применить позиции» — обновит дефолтные позиции работников на основе анализа.
                При создании нового расписания работники автоматически встанут на свои обычные позиции.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
