import React, { useState, useEffect } from 'react';
import { Copy, Check, Download, Save, FilePlus, RefreshCw, LogOut, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScheduleEditor } from '@/components/ScheduleEditor';
import { PreviewPanel } from '@/components/PreviewPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { TemplatesPanel } from '@/components/TemplatesPanel';
import { WorkersPanel } from '@/components/WorkersPanel';
import { ImportPanel } from '@/components/ImportPanel';
import { LoginPage } from '@/components/LoginPage';
import { useScheduleStore } from '@/store/scheduleStore';
import { useAuth } from '@/context/AuthContext';

const App: React.FC = () => {
  const { status, username, logout } = useAuth();
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
    if (status !== 'authenticated') return;
    loadSchedules();
    loadTemplates();
    loadWorkerOptions();
  }, [status, loadSchedules, loadTemplates, loadWorkerOptions]);

  useEffect(() => {
    if (status !== 'authenticated') return;
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
  }, [status, generateText, setActiveTab, saveSchedule, newSchedule]);

  const handleCopy = async () => {
    if (!generatedText) generateText();
    const ok = await copyText();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <CalendarDays className="h-8 w-8 animate-pulse" />
          <p className="text-sm">Загрузка…</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPage />;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                  Генератор расписания
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  {schedule.date} · {schedule.dayOfWeek} · {schedule.blocks.length} блоков
                  {lastSaved && (
                    <span className="hidden sm:inline ml-2">
                      · Сохранено {new Date(lastSaved).toLocaleTimeString('ru-RU')}
                    </span>
                  )}
                  {isSaving && <span className="ml-2 text-blue-600">Сохранение…</span>}
                </p>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="h-9 px-2 sm:px-3 text-muted-foreground hover:text-foreground shrink-0"
                title={username ? `Выйти (${username})` : 'Выйти'}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Выход</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto pb-1">
              <Button
                onClick={() => { generateText(); setActiveTab('preview'); }}
                variant="default"
                size="sm"
                className="h-10 px-3 shrink-0"
                title="Ctrl+G"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Сгенерировать
              </Button>
              <Button
                onClick={saveSchedule}
                variant="outline"
                size="sm"
                className="h-10 px-3 shrink-0"
                title="Ctrl+S"
              >
                <Save className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Сохранить</span>
              </Button>
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="h-10 px-3 shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 sm:mr-1.5 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 sm:mr-1.5" />
                )}
                <span className="hidden sm:inline">{copied ? 'Скопировано!' : 'Копировать'}</span>
              </Button>
              <Button
                onClick={exportTxt}
                variant="outline"
                size="sm"
                className="h-10 px-3 shrink-0"
              >
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">TXT</span>
              </Button>
              <Button
                onClick={newSchedule}
                variant="outline"
                size="sm"
                className="h-10 px-3 shrink-0"
                title="Ctrl+N"
              >
                <FilePlus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Новое</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-16 md:pb-10">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid grid-cols-6 w-full h-auto p-1 mb-3 sm:mb-4">
              <TabsTrigger value="editor" className="text-xs sm:text-sm h-9 px-1 sm:px-3">
                Редактор
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs sm:text-sm h-9 px-1 sm:px-3">
                Превью
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm h-9 px-1 sm:px-3">
                История
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs sm:text-sm h-9 px-1 sm:px-3">
                Шаблоны
              </TabsTrigger>
              <TabsTrigger value="workers" className="text-xs sm:text-sm h-9 px-1 sm:px-3">
                Работники
              </TabsTrigger>
              <TabsTrigger value="import" className="text-xs sm:text-sm h-9 px-1 sm:px-3">
                Импорт
              </TabsTrigger>
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

            <TabsContent value="import">
              <ImportPanel />
            </TabsContent>
          </Tabs>
        </main>

        {/* Keyboard shortcuts hint (desktop only) */}
        <footer className="hidden md:block fixed bottom-0 left-0 right-0 bg-white border-t py-1 px-4 text-xs text-muted-foreground text-center">
          Ctrl+B — добавить блок · Ctrl+M — сборка · Ctrl+G — сгенерировать · Ctrl+S — сохранить · Ctrl+N — новое расписание
        </footer>
      </div>
    </TooltipProvider>
  );
};

export default App;
