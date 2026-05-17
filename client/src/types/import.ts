export interface WorkerShiftStats {
  count: number;
  positions: Record<number, number>;
  mostFrequentPosition: number;
}

export interface WorkerStats {
  workerName: string;
  totalAppearances: number;
  shifts: Record<string, WorkerShiftStats>;
}

export interface BakingShiftDefault {
  senior: string;
  junior: string | null;
}

/** Day-aware defaults: dayOfWeek -> shift -> position/worker */
export type DayAwareDefaults = Record<string, Partial<Record<string, number>>>;
export type DayAwareKneadDefaults = Record<string, Record<string, string>>;
export type DayAwareBakingDefaults = Record<string, Record<string, BakingShiftDefault>>;

export interface AnalyzeResult {
  schedulesCount: number;
  dateRange: { from: string; to: string };
  totalRecords: number;
  workerStats: WorkerStats[];
  suggestedDefaults: Record<string, DayAwareDefaults>;
  kneadDefaults: DayAwareKneadDefaults;
  bakingDefaults: DayAwareBakingDefaults;
}

export interface ApplyDefaultsResult {
  created: string[];
  updated: string[];
}

export interface ImportSchedulesResult {
  imported: { id: string; date: string; dayOfWeek: string }[];
  count: number;
}
