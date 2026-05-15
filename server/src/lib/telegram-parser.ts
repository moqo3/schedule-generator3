/**
 * Parser for Telegram schedule messages.
 *
 * Handles the emoji-rich format used in Telegram:
 *   1⃣Ди2⃣А3⃣о.А   (keycap digits for positions)
 *   🫗 Замес / 🫔 Разделка / 🥖 Выпечка / 📦 Сборка
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedWorker {
  position: number;
  name: string;
  note?: string;
}

export interface ParsedBlock {
  order: number;
  title: string;
  workType: string;
  isAssemblyBlock: boolean;
  kneadTime: string;
  kneadCount: string;
  kneadWorker: string;
  cuttingStartTime: string;
  cuttingWorkers: ParsedWorker[];
  bakingTime: string;
  bakingWorkers: string[];
  assemblyWorker: string;
  assemblyTime: string;
  extraSections: string;
}

export interface ParsedSchedule {
  date: string;          // ISO format: "2026-05-13"
  displayDate: string;   // original: "13.05"
  dayOfWeek: string;     // "Среда"
  blocks: ParsedBlock[];
  rawText: string;
}

export interface WorkerShiftRecord {
  date: string;
  dayOfWeek: string;
  shift: number;
  position: number;
  workerName: string;
}

export interface WorkerStats {
  workerName: string;
  totalAppearances: number;
  shifts: Record<string, {  // key: "1" | "2" | "3"
    count: number;
    positions: Record<number, number>;  // position -> count
    mostFrequentPosition: number;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Keycap digit: "1⃣" = U+0031 U+FE0F U+20E3  or  U+0031 U+20E3 */
const KEYCAP_RE = /(\d)\uFE0F?\u20E3/g;

/**
 * Parse worker positions from lines like:
 *   1⃣Ди2⃣А3⃣о.А4⃣о.Да5⃣СТ
 *   1⃣о.Да2⃣СЛ3⃣СТ4⃣А
 *   5⃣Е(СЮ с 14.00)
 */
function parseCuttingWorkers(text: string): ParsedWorker[] {
  const workers: ParsedWorker[] = [];

  // Split by keycap digits, keeping the digit as a capture group
  const parts = text.split(KEYCAP_RE).filter(Boolean);

  // parts alternates: [pre, digit, name, digit, name, ...]
  // Find first digit index
  let i = 0;
  while (i < parts.length) {
    const digitStr = parts[i];
    if (/^\d$/.test(digitStr) && i + 1 < parts.length) {
      const position = parseInt(digitStr, 10);
      let rawName = parts[i + 1];

      // Extract note in parentheses
      let note: string | undefined;
      const noteMatch = rawName.match(/\(([^)]*)\)/);
      if (noteMatch) {
        note = noteMatch[1].trim();
        rawName = rawName.replace(/\([^)]*\)/, '').trim();
      }

      // Clean up name: remove trailing dots, spaces
      const name = rawName.replace(/\s+/g, '').replace(/\.$/, '');

      if (name) {
        workers.push({ position, name, ...(note ? { note } : {}) });
      }
      i += 2;
    } else {
      i++;
    }
  }

  return workers;
}

/** Normalize time: "6.10" -> "06:10", "8.00" -> "08:00" */
function normalizeTime(t: string): string {
  const m = t.match(/(\d{1,2})[.:](\d{1,2})/);
  if (!m) return t;
  return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
}

/** Strip common emoji from a line (for cleaner matching). */
function stripEmoji(line: string): string {
  return line
    .replace(/[\u{1F96B}\u{1F96A}\u{1F956}\u{1F4E6}]/gu, '')  // 🫗🫔🥖📦
    .trim();
}

// ── Date parsing ─────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  'понедельник', 'вторник', 'среда', 'четверг',
  'пятница', 'суббота', 'воскресенье',
];

/**
 * Parse "13.05" or "13.05 Среда" into { displayDate, dayOfWeek, isoDate }.
 * Year is inferred from context or defaults to current year.
 */
function parseDateLine(line: string, yearHint?: number): {
  displayDate: string;
  dayOfWeek: string;
  isoDate: string;
} | null {
  const m = line.match(/(\d{1,2})\.(\d{1,2})\s+(\S+)/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const dayOfWeek = m[3];
  const year = yearHint ?? new Date().getFullYear();
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    displayDate: `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`,
    dayOfWeek,
    isoDate,
  };
}

// ── Block parsing ────────────────────────────────────────────────────────────

function createEmptyParsedBlock(order: number): ParsedBlock {
  return {
    order,
    title: '',
    workType: '',
    isAssemblyBlock: false,
    kneadTime: '',
    kneadCount: '',
    kneadWorker: '',
    cuttingStartTime: '',
    cuttingWorkers: [],
    bakingTime: '',
    bakingWorkers: [],
    assemblyWorker: '',
    assemblyTime: '',
    extraSections: '',
  };
}

/** Detect if a line starts a new block: "1 разделка ...", "2 разделка ...", "Сборка ..." */
function isBlockHeader(line: string): { order: number; title: string; workType: string; isAssembly: boolean } | null {
  const cleaned = stripEmoji(line).trim();

  // Assembly block: "Сборка 📦📦📦 Е с 14.00"
  if (/^сборка/i.test(cleaned)) {
    return { order: 0, title: 'Сборка', workType: '', isAssembly: true };
  }

  // Regular block: "1 разделка служебные" or "1 разделка служ/мелкие"
  const m = cleaned.match(/^(\d+)\s+разделка\s*(.*)/i);
  if (m) {
    return {
      order: parseInt(m[1], 10),
      title: `${m[1]} разделка`,
      workType: m[2].trim(),
      isAssembly: false,
    };
  }

  return null;
}

function parseBlock(lines: string[], startOrder: number): ParsedBlock {
  const block = createEmptyParsedBlock(startOrder);
  const firstLine = lines[0] || '';
  const header = isBlockHeader(firstLine);

  if (header?.isAssembly) {
    block.isAssemblyBlock = true;
    block.title = 'Сборка';
    // Parse "Сборка 📦📦📦 Е с 14.00"
    const cleaned = stripEmoji(firstLine).replace(/^сборка\s*/i, '').trim();
    const timeMatch = cleaned.match(/с\s+(\d{1,2}[.:]\d{2})/);
    if (timeMatch) {
      block.assemblyTime = normalizeTime(timeMatch[1]);
      const before = cleaned.substring(0, cleaned.indexOf('с ')).trim();
      block.assemblyWorker = before;
    } else {
      block.assemblyWorker = cleaned;
    }
    return block;
  }

  if (header) {
    block.order = header.order;
    block.title = header.title;
    block.workType = capitalizeFirst(header.workType);
  }

  let section: string = 'header';
  const cuttingLines: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const stripped = stripEmoji(line).trim();
    if (!stripped) continue;

    // Detect sections by emoji or keywords
    if (/замес/i.test(stripped)) {
      section = 'knead';
      // "Замес в 6.10 5 Ди." — time, then count, then worker
      const timeMatch = stripped.match(/в\s+(\d{1,2}[.:]\d{2})/);
      if (timeMatch) block.kneadTime = normalizeTime(timeMatch[1]);

      // Everything after time pattern
      let afterTime = stripped;
      if (timeMatch) {
        const idx = afterTime.indexOf(timeMatch[0]) + timeMatch[0].length;
        afterTime = afterTime.substring(idx).trim();
      } else {
        afterTime = afterTime.replace(/замес/i, '').trim();
      }
      const countMatch = afterTime.match(/^(\d+)\s*/);
      if (countMatch) {
        block.kneadCount = countMatch[1];
        const worker = afterTime.substring(countMatch[0].length).replace(/\.$/, '').trim();
        block.kneadWorker = worker;
      }
      continue;
    }

    if (/разделка/i.test(stripped) && !/^\d+\s+разделка/i.test(stripped)) {
      section = 'cutting';
      const timeMatch = stripped.match(/с\s+(\d{1,2}[.:]\d{2})/);
      if (timeMatch) block.cuttingStartTime = normalizeTime(timeMatch[1]);
      continue;
    }

    if (/выпечка/i.test(stripped)) {
      // Flush cutting lines
      if (cuttingLines.length > 0) {
        block.cuttingWorkers = parseCuttingWorkers(cuttingLines.join(''));
        cuttingLines.length = 0;
      }
      section = 'baking';
      const timeMatch = stripped.match(/с\s+(\d{1,2}[.:]\d{2})/);
      if (timeMatch) block.bakingTime = normalizeTime(timeMatch[1]);

      // Workers after time or after "Выпечка"
      const workersPart = stripped.replace(/выпечка/i, '').replace(/с\s+\d{1,2}[.:]\d{2}/, '').trim();
      if (workersPart) {
        block.bakingWorkers = workersPart.split('.').map(w => w.trim()).filter(Boolean);
      }
      continue;
    }

    // Accumulate cutting worker lines (lines with keycap digits)
    if (section === 'cutting' && KEYCAP_RE.test(line)) {
      cuttingLines.push(line);
      KEYCAP_RE.lastIndex = 0;
      continue;
    }

    if (section === 'baking') {
      const workersPart = stripped;
      if (workersPart) {
        const bw = workersPart.split('.').map(w => w.trim()).filter(Boolean);
        block.bakingWorkers.push(...bw);
      }
      continue;
    }

    // Anything else is extra
    if (section !== 'header' && section !== 'cutting') {
      block.extraSections += (block.extraSections ? '\n' : '') + stripped;
    }
  }

  // Flush remaining cutting lines
  if (cuttingLines.length > 0) {
    block.cuttingWorkers = parseCuttingWorkers(cuttingLines.join(''));
  }

  return block;
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a multi-schedule Telegram export. Each schedule starts with a date line.
 * Lines like `[12.05.2026 10:27] Author:` are metadata and stripped.
 */
export function parseTelegramSchedules(text: string): ParsedSchedule[] {
  const schedules: ParsedSchedule[] = [];

  // Normalize line endings
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');

  // Strip Telegram metadata lines: [dd.mm.yyyy HH:MM] Author:
  const lines: string[] = [];
  let yearHint: number | undefined;
  for (const raw of rawLines) {
    const metaMatch = raw.match(/^\[(\d{2})\.(\d{2})\.(\d{4})\s+\d{2}:\d{2}\]\s*[^:]*:\s*(.*)/);
    if (metaMatch) {
      yearHint = parseInt(metaMatch[3], 10);
      const rest = metaMatch[4].trim();
      if (rest) lines.push(rest);
    } else {
      lines.push(raw);
    }
  }

  // Split into schedule chunks: each starts with a date line ("13.05 Среда")
  const scheduleChunks: { dateInfo: ReturnType<typeof parseDateLine>; lines: string[]; rawLines: string[] }[] = [];
  let currentChunk: { dateInfo: ReturnType<typeof parseDateLine>; lines: string[]; rawLines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const dateInfo = parseDateLine(trimmed, yearHint);
    if (dateInfo && DAYS_OF_WEEK.includes(dateInfo.dayOfWeek.toLowerCase())) {
      if (currentChunk) scheduleChunks.push(currentChunk);
      currentChunk = { dateInfo, lines: [], rawLines: [line] };
    } else if (currentChunk) {
      currentChunk.lines.push(line);
      currentChunk.rawLines.push(line);
    }
  }
  if (currentChunk) scheduleChunks.push(currentChunk);

  // Parse each schedule chunk into blocks
  for (const chunk of scheduleChunks) {
    if (!chunk.dateInfo) continue;

    const blockGroups: string[][] = [];
    let currentGroup: string[] | null = null;

    for (const line of chunk.lines) {
      const trimmed = line.trim();
      const stripped = stripEmoji(trimmed);

      if (isBlockHeader(stripped) || isBlockHeader(trimmed)) {
        if (currentGroup) blockGroups.push(currentGroup);
        currentGroup = [trimmed];
      } else if (currentGroup) {
        currentGroup.push(trimmed);
      }
    }
    if (currentGroup) blockGroups.push(currentGroup);

    const blocks: ParsedBlock[] = [];
    let assemblyOrder = 0;
    for (const group of blockGroups) {
      const block = parseBlock(group, blocks.length + 1);
      if (block.isAssemblyBlock) {
        assemblyOrder++;
        block.order = blocks.length + 1;
      }
      blocks.push(block);
    }

    schedules.push({
      date: chunk.dateInfo.isoDate,
      displayDate: chunk.dateInfo.displayDate,
      dayOfWeek: chunk.dateInfo.dayOfWeek,
      blocks,
      rawText: chunk.rawLines.join('\n'),
    });
  }

  return schedules;
}

// ── Analytics ────────────────────────────────────────────────────────────────

/**
 * Extract all worker-shift-position records from parsed schedules.
 */
export function extractWorkerRecords(schedules: ParsedSchedule[]): WorkerShiftRecord[] {
  const records: WorkerShiftRecord[] = [];

  for (const schedule of schedules) {
    for (const block of schedule.blocks) {
      if (block.isAssemblyBlock) continue;

      for (const worker of block.cuttingWorkers) {
        records.push({
          date: schedule.date,
          dayOfWeek: schedule.dayOfWeek,
          shift: block.order,
          position: worker.position,
          workerName: worker.name,
        });
      }
    }
  }

  return records;
}

/**
 * Compute statistics for each worker: how often they appear on each shift
 * and at which position.
 */
export function computeWorkerStats(records: WorkerShiftRecord[]): WorkerStats[] {
  const statsMap = new Map<string, {
    count: number;
    shifts: Map<string, { count: number; positions: Map<number, number> }>;
  }>();

  for (const record of records) {
    const key = record.workerName;
    if (!statsMap.has(key)) {
      statsMap.set(key, { count: 0, shifts: new Map() });
    }
    const stat = statsMap.get(key)!;
    stat.count++;

    const shiftKey = String(record.shift);
    if (!stat.shifts.has(shiftKey)) {
      stat.shifts.set(shiftKey, { count: 0, positions: new Map() });
    }
    const shiftStat = stat.shifts.get(shiftKey)!;
    shiftStat.count++;
    shiftStat.positions.set(record.position, (shiftStat.positions.get(record.position) || 0) + 1);
  }

  const result: WorkerStats[] = [];
  for (const [name, stat] of statsMap) {
    const shifts: WorkerStats['shifts'] = {};
    for (const [shiftKey, shiftStat] of stat.shifts) {
      const positions: Record<number, number> = {};
      let maxPos = 0;
      let maxCount = 0;
      for (const [pos, count] of shiftStat.positions) {
        positions[pos] = count;
        if (count > maxCount) {
          maxCount = count;
          maxPos = pos;
        }
      }
      shifts[shiftKey] = {
        count: shiftStat.count,
        positions,
        mostFrequentPosition: maxPos,
      };
    }
    result.push({
      workerName: name,
      totalAppearances: stat.count,
      shifts,
    });
  }

  return result.sort((a, b) => b.totalAppearances - a.totalAppearances);
}

/**
 * Compute default positions for each worker per shift (1/2/3).
 * Returns a map: workerName -> { "1": position, "2": position, "3": position }
 */
export function computeDefaultPositions(
  records: WorkerShiftRecord[],
): Map<string, Partial<Record<'1' | '2' | '3', number>>> {
  const stats = computeWorkerStats(records);
  const result = new Map<string, Partial<Record<'1' | '2' | '3', number>>>();

  for (const stat of stats) {
    const defaults: Partial<Record<'1' | '2' | '3', number>> = {};
    for (const shiftKey of ['1', '2', '3'] as const) {
      const shiftStat = stat.shifts[shiftKey];
      if (shiftStat && shiftStat.mostFrequentPosition > 0) {
        defaults[shiftKey] = shiftStat.mostFrequentPosition;
      }
    }
    if (Object.keys(defaults).length > 0) {
      result.set(stat.workerName, defaults);
    }
  }

  return result;
}
