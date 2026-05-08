import type { Schedule, Template, WorkerOption } from '@/types/schedule';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }
  return res.json();
}

export const api = {
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
  createWorker: (data: { name: string; shortName: string; position?: string | null }) =>
    request<WorkerOption>('/workers', { method: 'POST', body: JSON.stringify(data) }),
  updateWorker: (id: string, data: Partial<{ name: string; shortName: string; position: string | null }>) =>
    request<WorkerOption>(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorker: (id: string) =>
    request<void>(`/workers/${id}`, { method: 'DELETE' }),
};
