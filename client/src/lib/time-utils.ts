/**
 * Time utilities — accept legacy "H.MM" / "HH.MM" and modern "HH:mm" formats,
 * normalize to "HH:mm".
 */

const TIME_RE = /^\s*(\d{1,2})[.:](\d{1,2})\s*$/;

export interface ParsedTime {
  hours: number;
  minutes: number;
}

export function parseTime(value: string): ParsedTime | null {
  if (!value) return null;
  const m = value.match(TIME_RE);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return { hours, minutes };
}

export function formatTime(t: ParsedTime): string {
  const h = String(t.hours).padStart(2, '0');
  const m = String(t.minutes).padStart(2, '0');
  return `${h}:${m}`;
}

export function normalizeTime(value: string): string {
  const parsed = parseTime(value);
  return parsed ? formatTime(parsed) : value;
}

export function addMinutes(t: ParsedTime, deltaMinutes: number): ParsedTime {
  const total = t.hours * 60 + t.minutes + deltaMinutes;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    hours: Math.floor(wrapped / 60),
    minutes: wrapped % 60,
  };
}

/** Round minutes down to the nearest 15-minute step. */
export function snapTo15(t: ParsedTime): ParsedTime {
  return {
    hours: t.hours,
    minutes: Math.floor(t.minutes / 15) * 15,
  };
}

export const TIME_OFFSETS = [-60, -45, -30, -15, 0, 15, 30, 45, 60] as const;

/**
 * Generate quick-pick options around a base time:
 * base −60 … +60 minutes in 15-min steps.
 */
export function buildTimeOptions(baseTime: string): string[] {
  const parsed = parseTime(baseTime);
  if (!parsed) return [];
  const snapped = snapTo15(parsed);
  return TIME_OFFSETS.map(d => formatTime(addMinutes(snapped, d)));
}
