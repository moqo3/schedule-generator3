import type { Schedule, Template, WorkerOption, DefaultPositions } from '@/types/schedule';
import type { AnalyzeResult, ApplyDefaultsResult, ImportSchedulesResult, DayAwareDefaults, DayAwareKneadDefaults, DayAwareBakingDefaults } from '@/types/import';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText);
    throw new ApiError(error || res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  auth: {
    login: (data: { username: string; password: string }) =>
      request<{ ok: boolean; username: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ username: string }>('/auth/me'),
  },

  // Schedules
  getSchedules: () => request<Schedule[]>('/schedules'),
  getSchedule: (id: string) => request<Schedule>(`/schedules/${id}`),
  createSchedule: (data: Partial<Schedule>) =>
    request<Schedule>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: string, data: Partial<Schedule>) =>
    request<Schedule>(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id: string) =>
    request<void>(`/schedules/${id}`, { method: 'DELETE' }),
  autosave: (id: string, data: Partial<Schedule>) =>
    request<Schedule>(`/schedules/${id}/autosave`, { method: 'PUT', body: JSON.stringify(data) }),

  // Templates
  getTemplates: () => request<Template[]>('/templates'),
  createTemplate: (data: Partial<Template>) =>
    request<Template>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) =>
    request<void>(`/templates/${id}`, { method: 'DELETE' }),

  // Generate text
  generateText: (id: string) => request<{ text: string }>(`/schedules/${id}/generate`),

  // Workers
  getWorkers: () => request<WorkerOption[]>('/workers'),
  createWorker: (data: {
    name: string;
    shortName: string;
    position?: string | null;
    defaultPositions?: DefaultPositions | null;
  }) => request<WorkerOption>('/workers', { method: 'POST', body: JSON.stringify(data) }),
  updateWorker: (
    id: string,
    data: Partial<{
      name: string;
      shortName: string;
      position: string | null;
      defaultPositions: DefaultPositions | null;
    }>,
  ) => request<WorkerOption>(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorker: (id: string) =>
    request<void>(`/workers/${id}`, { method: 'DELETE' }),

  // Import
  import: {
    analyze: (text: string) =>
      request<AnalyzeResult>('/import/analyze', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    applyDefaults: (
      defaults: Record<string, DayAwareDefaults>,
      kneadDefaults?: DayAwareKneadDefaults,
      bakingDefaults?: DayAwareBakingDefaults,
    ) =>
      request<ApplyDefaultsResult>('/import/apply-defaults', {
        method: 'POST',
        body: JSON.stringify({ defaults, kneadDefaults, bakingDefaults }),
      }),
    importSchedules: (text: string) =>
      request<ImportSchedulesResult>('/import/schedules', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    getStats: () => request<CumulativeStats>('/import/stats'),
    undoStats: () => request<{ restored: boolean; restoredDates: number; removedDates: string[] }>(
      '/import/stats/undo', { method: 'POST' },
    ),
  },
};

export interface CumulativeStats {
  importedDates: string[];
  cutting: Record<string, Record<string, Record<string, number>>>;
  knead: Record<string, Record<string, number>>;
  baking: Record<string, { senior: Record<string, number>; junior: Record<string, number> }>;
}
