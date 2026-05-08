import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, Save, FilePlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScheduleEditor } from '@/components/ScheduleEditor';
import { PreviewPanel } from '@/components/PreviewPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { TemplatesPanel } from '@/components/TemplatesPanel';
import { WorkersPanel } from '@/components/WorkersPanel';
import { useScheduleStore } from '@/store/scheduleStore';

const App: React.FC = () => {
  const {
    schedule,
    isSaving,
    lastSaved,
    generatedText,
    activeTab,
    setActiveTab,
    generateText,
    copyText,
    exportTxt,
    saveSchedule,
    newSchedule,
    loadSchedules,
    loadTemplates,
    loadWorkerOptions,
  } = useScheduleStore();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSchedules();
    loadTemplates();
    loadWorkerOptions();
  }, [loadSchedules, loadTemplates, loadWorkerOptions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        generateText();
        setActiveTab('preview');
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveSchedule();
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newSchedule();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generateText, setActiveTab, saveSchedule, newSchedule]);

  const handleCopy = async () => {
    if (!generatedText) generateText();
    const ok = await copyText();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Генератор расписания</h1>
                <p className="text-xs text-muted-foreground">
                  {schedule.date} {schedule.dayOfWeek} &middot; {schedule.blocks.length} блоков
                  {lastSaved && (
                    <span className="ml-2">
                      &middot; Сохранено {new Date(lastSaved).toLocaleTimeString('ru-RU')}
                    </span>
                  )}
                  {isSaving && <span className="ml-2 text-blue-600">Сохранение...</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={newSchedule} variant="outline" size="sm" title="Ctrl+N">
                  <FilePlus className="h-4 w-4 mr-1" />
                  Новое
                </Button>
                <Button onClick={saveSchedule} variant="outline" size="sm" title="Ctrl+S">
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить
                </Button>
                <Button
                  onClick={() => { generateText(); setActiveTab('preview'); }}
                  variant="default"
                  size="sm"
                  title="Ctrl+G"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Сгенерировать
                </Button>
                <Button onClick={handleCopy} variant="outline" size="sm">
                  {copied ? <Check className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Скопировано!' : 'Копировать'}
                </Button>
                <Button onClick={exportTxt} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  TXT
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="editor">Редактор</TabsTrigger>
              <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
              <TabsTrigger value="templates">Шаблоны</TabsTrigger>
              <TabsTrigger value="workers">Работники</TabsTrigger>
            </TabsList>

            <TabsContent value="editor">
              <ScheduleEditor />
            </TabsContent>

            <TabsContent value="preview">
              <PreviewPanel />
            </TabsContent>

            <TabsContent value="history">
              <HistoryPanel />
            </TabsContent>

            <TabsContent value="templates">
              <TemplatesPanel />
            </TabsContent>

            <TabsContent value="workers">
              <WorkersPanel />
            </TabsContent>
          </Tabs>
        </main>

        {/* Keyboard shortcuts hint */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t py-1 px-4 text-xs text-muted-foreground text-center">
          Ctrl+B — добавить блок &middot; Ctrl+M — сборка &middot; Ctrl+G — сгенерировать &middot; Ctrl+S — сохранить &middot; Ctrl+N — новое расписание
        </footer>
      </div>
    </TooltipProvider>
  );
};

export default App;
