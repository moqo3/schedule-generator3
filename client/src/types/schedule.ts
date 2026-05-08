export interface Worker {
  id: string;
  position: number;
  name: string;
}

export interface WorkerOption {
  id: string;
  name: string;
  shortName: string;
  position: string | null;
  createdAt: string;
}

export interface ScheduleBlock {
  id: string;
  order: number;
  title: string;
  workType: string;
  kneadTime: string;
  kneadCount: string;
  kneadWorker: string;
  cuttingStartTime: string;
  cuttingWorkers: Worker[];
  bakingTime: string;
  bakingWorkers: string[];
  assemblyWorker: string;
  assemblyTime: string;
  isAssemblyBlock: boolean;
  extraSections: string;
}

export function normalizeBakingWorkers(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

export function normalizeBlock(block: ScheduleBlock): ScheduleBlock {
  return {
    ...block,
    bakingWorkers: normalizeBakingWorkers(block.bakingWorkers),
  };
}

export interface Schedule {
  id: string;
  date: string;
  dayOfWeek: string;
  blocks: ScheduleBlock[];
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
}

export interface Template {
  id: string;
  name: string;
  blocks: ScheduleBlock[];
  createdAt: string;
}

export const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
] as const;

export function createEmptyBlock(order: number): ScheduleBlock {
  return {
    id: crypto.randomUUID(),
    order,
    title: `${order} разделка`,
    workType: '',
    kneadTime: '',
    kneadCount: '',
    kneadWorker: '',
    cuttingStartTime: '',
    cuttingWorkers: [],
    bakingTime: '',
    bakingWorkers: [],
    assemblyWorker: '',
    assemblyTime: '',
    isAssemblyBlock: false,
    extraSections: '',
  };
}

export function createEmptySchedule(): Schedule {
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7;
  return {
    id: crypto.randomUUID(),
    date: now.toISOString().split('T')[0],
    dayOfWeek: DAYS_OF_WEEK[dayIndex],
    blocks: [createEmptyBlock(1)],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    isDraft: true,
  };
}
