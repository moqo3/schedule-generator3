export interface Worker {
  id: string;
  position: number;
  name: string;
}

/** Map shift number ("1"|"2"|"3") -> position within that shift. */
export type ShiftPositions = Partial<Record<'1' | '2' | '3' | '4', number>>;

/**
 * Day-of-week aware default positions.
 * Maps dayOfWeek -> shift -> position.
 * Example: { "Понедельник": { "1": 3, "2": 5 }, "Вторник": { "1": 2 } }
 *
 * Legacy format (shift -> position) is also supported for backwards compat.
 */
export type DefaultPositions = Record<string, ShiftPositions> | ShiftPositions;

/** Check if defaultPositions uses the new day-aware format. */
export function isDayAwarePositions(dp: DefaultPositions): dp is Record<string, ShiftPositions> {
  const keys = Object.keys(dp);
  if (keys.length === 0) return false;
  return typeof Object.values(dp)[0] === 'object' && !Array.isArray(Object.values(dp)[0])
    && keys.some(k => DAYS_OF_WEEK.includes(k as typeof DAYS_OF_WEEK[number]));
}

/** Extract ShiftPositions for a given day, falling back to legacy format. */
export function getPositionsForDay(
  dp: DefaultPositions | null,
  dayOfWeek: string,
): ShiftPositions | null {
  if (!dp) return null;
  if (isDayAwarePositions(dp)) {
    return (dp[dayOfWeek] as ShiftPositions) ?? null;
  }
  // Legacy: shift -> position directly
  return dp as ShiftPositions;
}

export interface WorkerOption {
  id: string;
  name: string;
  shortName: string;
  position: string | null;
  defaultPositions: DefaultPositions | null;
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

export interface ShiftDefaults {
  kneadTime: string;
  cuttingStartTime: string;
  bakingTime: string;
  assemblyTime: string;
}

const SHIFT_DEFAULTS: Record<number, ShiftDefaults> = {
  1: { kneadTime: '06:10', cuttingStartTime: '08:00', bakingTime: '10:45', assemblyTime: '14:30' },
  2: { kneadTime: '10:30', cuttingStartTime: '12:00', bakingTime: '',      assemblyTime: '14:30' },
  3: { kneadTime: '15:00', cuttingStartTime: '16:30', bakingTime: '',      assemblyTime: '14:30' },
};

const FALLBACK_DEFAULTS: ShiftDefaults = {
  kneadTime: '',
  cuttingStartTime: '',
  bakingTime: '',
  assemblyTime: '14:30',
};

export function getShiftDefaults(order: number): ShiftDefaults {
  return SHIFT_DEFAULTS[order] ?? FALLBACK_DEFAULTS;
}

/** Standard times used by the time picker when value is empty (anchor for ±1h options). */
export const STANDARD_TIMES = {
  kneadTime: '06:10',
  cuttingStartTime: '08:00',
  bakingTime: '10:45',
  assemblyTime: '14:30',
} as const;

export function createEmptyBlock(order: number): ScheduleBlock {
  const d = getShiftDefaults(order);
  return {
    id: crypto.randomUUID(),
    order,
    title: `${order} разделка`,
    workType: 'Мелкие',
    kneadTime: d.kneadTime,
    kneadCount: '',
    kneadWorker: '',
    cuttingStartTime: d.cuttingStartTime,
    cuttingWorkers: [],
    bakingTime: d.bakingTime,
    bakingWorkers: [],
    assemblyWorker: '',
    assemblyTime: d.assemblyTime,
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
