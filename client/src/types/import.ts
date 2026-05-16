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

export interface AnalyzeResult {
  schedulesCount: number;
  dateRange: { from: string; to: string };
  totalRecords: number;
  workerStats: WorkerStats[];
  suggestedDefaults: Record<string, Partial<Record<'1' | '2' | '3', number>>>;
  kneadDefaults: Record<string, string>;
  bakingDefaults: Record<string, BakingShiftDefault>;
}

export interface ApplyDefaultsResult {
  created: string[];
  updated: string[];
}

export interface ImportSchedulesResult {
  imported: { id: string; date: string; dayOfWeek: string }[];
  count: number;
}
