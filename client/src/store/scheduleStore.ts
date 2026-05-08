import { create } from 'zustand';
import type { Schedule, ScheduleBlock, Worker, Template, WorkerOption } from '@/types/schedule';
import { createEmptyBlock, createEmptySchedule, normalizeBlock } from '@/types/schedule';
import { api } from '@/lib/api';
import { generateTelegramText } from '@/lib/telegram-generator';

export type ActiveTab = 'editor' | 'preview' | 'history' | 'templates' | 'workers';

interface ScheduleState {
  schedule: Schedule;
  schedules: Schedule[];
  templates: Template[];
  workerOptions: WorkerOption[];
  generatedText: string;
  isSaving: boolean;
  lastSaved: string | null;
  activeTab: ActiveTab;

  setSchedule: (schedule: Schedule) => void;
  setActiveTab: (tab: ActiveTab) => void;
  updateDate: (date: string) => void;
  updateDayOfWeek: (day: string) => void;

  addBlock: () => void;
  addAssemblyBlock: () => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, updates: Partial<ScheduleBlock>) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;

  addWorker: (blockId: string) => void;
  removeWorker: (blockId: string, workerId: string) => void;
  updateWorker: (blockId: string, workerId: string, updates: Partial<Worker>) => void;

  generateText: () => void;
  copyText: () => Promise<boolean>;
  exportTxt: () => void;

  loadSchedules: () => Promise<void>;
  saveSchedule: () => Promise<void>;
  loadSchedule: (id: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  newSchedule: () => void;

  loadTemplates: () => Promise<void>;
  saveAsTemplate: (name: string) => Promise<void>;
  loadTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => Promise<void>;

  loadWorkerOptions: () => Promise<void>;
  createWorkerOption: (data: { name: string; shortName: string; position?: string | null }) => Promise<void>;
  updateWorkerOption: (id: string, data: Partial<{ name: string; shortName: string; position: string | null }>) => Promise<void>;
  deleteWorkerOption: (id: string) => Promise<void>;

  triggerAutosave: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedule: createEmptySchedule(),
  schedules: [],
  templates: [],
  workerOptions: [],
  generatedText: '',
  isSaving: false,
  lastSaved: null,
  activeTab: 'editor',

  setSchedule: (schedule) => set({ schedule }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  updateDate: (date) => {
    const schedule = { ...get().schedule, date, updatedAt: new Date().toISOString() };
    set({ schedule });
    get().triggerAutosave();
  },

  updateDayOfWeek: (day) => {
    const schedule = { ...get().schedule, dayOfWeek: day, updatedAt: new Date().toISOString() };
    set({ schedule });
    get().triggerAutosave();
  },

  addBlock: () => {
    const { schedule } = get();
    const newOrder = schedule.blocks.length + 1;
    const newBlock = createEmptyBlock(newOrder);
    const updated = {
      ...schedule,
      blocks: [...schedule.blocks, newBlock],
      updatedAt: new Date().toISOString(),
    };
    set({ schedule: updated });
    get().triggerAutosave();
  },

  addAssemblyBlock: () => {
    const { schedule } = get();
    const newOrder = schedule.blocks.length + 1;
    const newBlock: ScheduleBlock = {
      ...createEmptyBlock(newOrder),
      title: 'Сборка',
      isAssemblyBlock: true,
    };
    const updated = {
      ...schedule,
      blocks: [...schedule.blocks, newBlock],
      updatedAt: new Date().toISOString(),
    };
    set({ schedule: updated });
    get().triggerAutosave();
  },

  removeBlock: (blockId) => {
    const { schedule } = get();
    const blocks = schedule.blocks
      .filter(b => b.id !== blockId)
      .map((b, i) => ({ ...b, order: i + 1 }));
    set({ schedule: { ...schedule, blocks, updatedAt: new Date().toISOString() } });
    get().triggerAutosave();
  },

  updateBlock: (blockId, updates) => {
    const { schedule } = get();
    const blocks = schedule.blocks.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    set({ schedule: { ...schedule, blocks, updatedAt: new Date().toISOString() } });
    get().triggerAutosave();
  },

  reorderBlocks: (fromIndex, toIndex) => {
    const { schedule } = get();
    const blocks = [...schedule.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    const reordered = blocks.map((b, i) => ({ ...b, order: i + 1 }));
    set({ schedule: { ...schedule, blocks: reordered, updatedAt: new Date().toISOString() } });
    get().triggerAutosave();
  },

  addWorker: (blockId) => {
    const { schedule } = get();
    const blocks = schedule.blocks.map(b => {
      if (b.id !== blockId) return b;
      const nextPos = b.cuttingWorkers.length > 0
        ? Math.max(...b.cuttingWorkers.map(w => w.position)) + 1
        : 1;
      return {
        ...b,
        cuttingWorkers: [...b.cuttingWorkers, { id: crypto.randomUUID(), position: nextPos, name: '' }],
      };
    });
    set({ schedule: { ...schedule, blocks, updatedAt: new Date().toISOString() } });
    get().triggerAutosave();
  },

  removeWorker: (blockId, workerId) => {
    const { schedule } = get();
    const blocks = schedule.blocks.map(b => {
      if (b.id !== blockId) return b;
      const workers = b.cuttingWorkers
        .filter(w => w.id !== workerId)
        .map((w, i) => ({ ...w, position: i + 1 }));
      return { ...b, cuttingWorkers: workers };
    });
    set({ schedule: { ...schedule, blocks, updatedAt: new Date().toISOString() } });
    get().triggerAutosave();
  },

  updateWorker: (blockId, workerId, updates) => {
    const { schedule } = get();
    const blocks = schedule.blocks.map(b => {
      if (b.id !== blockId) return b;
      const workers = b.cuttingWorkers.map(w =>
        w.id === workerId ? { ...w, ...updates } : w
      );
      return { ...b, cuttingWorkers: workers };
    });
    set({ schedule: { ...schedule, blocks, updatedAt: new Date().toISOString() } });
    get().triggerAutosave();
  },

  generateText: () => {
    const { schedule } = get();
    const text = generateTelegramText(schedule);
    set({ generatedText: text });
  },

  copyText: async () => {
    const { generatedText } = get();
    if (!generatedText) {
      get().generateText();
    }
    const text = get().generatedText;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },

  exportTxt: () => {
    const { generatedText, schedule } = get();
    if (!generatedText) get().generateText();
    const text = get().generatedText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-${schedule.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },

  loadSchedules: async () => {
    try {
      const schedules = await api.getSchedules();
      set({ schedules });
    } catch (e) {
      console.error('Failed to load schedules', e);
    }
  },

  saveSchedule: async () => {
    const { schedule } = get();
    set({ isSaving: true });
    try {
      const saved = schedule.isDraft
        ? await api.createSchedule({ ...schedule, isDraft: false })
        : await api.updateSchedule(schedule.id, schedule);
      set({ schedule: saved, isSaving: false, lastSaved: new Date().toISOString() });
      get().loadSchedules();
    } catch (e) {
      console.error('Failed to save', e);
      set({ isSaving: false });
    }
  },

  loadSchedule: async (id) => {
    try {
      const schedule = await api.getSchedule(id);
      const normalized: Schedule = {
        ...schedule,
        blocks: (schedule.blocks ?? []).map(normalizeBlock),
      };
      set({ schedule: normalized, activeTab: 'editor' });
    } catch (e) {
      console.error('Failed to load schedule', e);
    }
  },

  deleteSchedule: async (id) => {
    try {
      await api.deleteSchedule(id);
      get().loadSchedules();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  },

  newSchedule: () => {
    set({ schedule: createEmptySchedule(), generatedText: '', lastSaved: null });
  },

  loadTemplates: async () => {
    try {
      const templates = await api.getTemplates();
      set({ templates });
    } catch (e) {
      console.error('Failed to load templates', e);
    }
  },

  saveAsTemplate: async (name) => {
    const { schedule } = get();
    try {
      await api.createTemplate({ name, blocks: schedule.blocks });
      get().loadTemplates();
    } catch (e) {
      console.error('Failed to save template', e);
    }
  },

  loadTemplate: (template) => {
    const { schedule } = get();
    const blocks = template.blocks.map(b => normalizeBlock({ ...b, id: crypto.randomUUID() }));
    set({
      schedule: { ...schedule, blocks, updatedAt: new Date().toISOString() },
      activeTab: 'editor',
    });
  },

  deleteTemplate: async (id) => {
    try {
      await api.deleteTemplate(id);
      get().loadTemplates();
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  },

  loadWorkerOptions: async () => {
    try {
      const workerOptions = await api.getWorkers();
      set({ workerOptions });
    } catch (e) {
      console.error('Failed to load workers', e);
    }
  },

  createWorkerOption: async (data) => {
    try {
      await api.createWorker(data);
      await get().loadWorkerOptions();
    } catch (e) {
      console.error('Failed to create worker', e);
    }
  },

  updateWorkerOption: async (id, data) => {
    try {
      await api.updateWorker(id, data);
      await get().loadWorkerOptions();
    } catch (e) {
      console.error('Failed to update worker', e);
    }
  },

  deleteWorkerOption: async (id) => {
    try {
      await api.deleteWorker(id);
      await get().loadWorkerOptions();
    } catch (e) {
      console.error('Failed to delete worker', e);
    }
  },

  triggerAutosave: () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(async () => {
      const { schedule } = get();
      set({ isSaving: true });
      try {
        if (!schedule.isDraft) {
          await api.autosave(schedule.id, schedule);
        }
        set({ isSaving: false, lastSaved: new Date().toISOString() });
      } catch {
        set({ isSaving: false });
      }
    }, 2000);
  },
}));
