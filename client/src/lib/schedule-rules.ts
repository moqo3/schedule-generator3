/**
 * Rule-based worker assignment algorithm for the bakery schedule.
 *
 * Weights encode priority:
 *   MUST (100) — worker must be at this position/shift
 *   HIGH (80)  — preferred choice
 *   MEDIUM (50) — regular / substitute
 *   LOW (20)   — rare / occasional
 *   NEVER (0)  — forbidden
 *
 * Rules implemented:
 *   1. Saturday = off for everyone; Sunday = Ди, Ф off (ПГ baking-only)
 *   2. Mon–Fri shift 1: Ди knead + pos 1, Ф senior baker
 *   3. Sunday special: СЛ knead, о.Да pos 1, ПГ/СФ senior baker (never Ф)
 *   4. Stable baking pairs per shift
 *   5. Assembly on Пн/Ср/Вс with priority workers
 */

type Weight = 'MUST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEVER';

const W: Record<Weight, number> = {
  MUST: 100,
  HIGH: 80,
  MEDIUM: 50,
  LOW: 20,
  NEVER: 0,
};

type ShiftKey = '1' | '2' | '3' | '4';

// ──────────────────────────────────────────────────────────────
// Rule 1 — Availability
// ──────────────────────────────────────────────────────────────

const SUNDAY_UNAVAILABLE = new Set(['Ди', 'Ф']);
const SUNDAY_BAKING_ONLY = new Set(['ПГ']);

function isAvailableForCutting(worker: string, day: string): boolean {
  if (day === 'Суббота') return false;
  if (day === 'Воскресенье') {
    return !SUNDAY_UNAVAILABLE.has(worker) && !SUNDAY_BAKING_ONLY.has(worker);
  }
  return true;
}

function isAvailableForBaking(worker: string, day: string): boolean {
  if (day === 'Суббота') return false;
  if (day === 'Воскресенье') return !SUNDAY_UNAVAILABLE.has(worker);
  return true;
}

function isAvailableForKnead(worker: string, day: string): boolean {
  if (day === 'Суббота') return false;
  if (day === 'Воскресенье') {
    return !SUNDAY_UNAVAILABLE.has(worker) && !SUNDAY_BAKING_ONLY.has(worker);
  }
  return true;
}

// ──────────────────────────────────────────────────────────────
// Knead (Замес)
// ──────────────────────────────────────────────────────────────

const KNEAD_WEIGHTS: Record<string, Partial<Record<ShiftKey, Weight>>> = {
  'Ди': { '1': 'MUST', '2': 'LOW', '3': 'NEVER' },
  'СЛ': { '1': 'NEVER', '2': 'HIGH', '3': 'HIGH' },
  'Е':  { '1': 'NEVER', '2': 'MEDIUM', '3': 'NEVER' },
  'СТ': { '1': 'NEVER', '2': 'LOW', '3': 'LOW' },
};

export function getKneadAssignment(day: string, shift: ShiftKey): string {
  if (day === 'Суббота') return '';

  // Rule 3: Sunday → СЛ always
  if (day === 'Воскресенье') return 'СЛ';

  // Rule 2: Mon–Fri shift 1 → Ди
  if (shift === '1') return 'Ди';

  // General: highest-weight available worker
  let best = '';
  let bestScore = 0;
  for (const [worker, shifts] of Object.entries(KNEAD_WEIGHTS)) {
    if (!isAvailableForKnead(worker, day)) continue;
    let score = W[shifts[shift] ?? 'NEVER'];
    // Е on knead shift 2 only on Среда
    if (worker === 'Е' && shift === '2' && day !== 'Среда') score = 0;
    if (score > bestScore) {
      bestScore = score;
      best = worker;
    }
  }
  return best;
}

// ──────────────────────────────────────────────────────────────
// Cutting (Разделка)
// ──────────────────────────────────────────────────────────────

const CUTTING_SHIFT_WEIGHTS: Record<string, Partial<Record<ShiftKey, Weight>>> = {
  'А':    { '1': 'HIGH', '2': 'HIGH', '3': 'LOW', '4': 'LOW' },
  'Ди':   { '1': 'HIGH', '2': 'MEDIUM', '3': 'LOW', '4': 'NEVER' },
  'о.Да': { '1': 'MEDIUM', '2': 'MUST', '3': 'HIGH', '4': 'MEDIUM' },
  'СТ':   { '1': 'HIGH', '2': 'MEDIUM', '3': 'LOW', '4': 'NEVER' },
  'М':    { '1': 'HIGH', '2': 'LOW', '3': 'LOW', '4': 'NEVER' },
  'ПН':   { '1': 'HIGH', '2': 'MEDIUM', '3': 'NEVER', '4': 'NEVER' },
  'СЛ':   { '1': 'LOW', '2': 'HIGH', '3': 'HIGH', '4': 'NEVER' },
  'Де':   { '1': 'MEDIUM', '2': 'MEDIUM', '3': 'LOW', '4': 'NEVER' },
  'о.А':  { '1': 'NEVER', '2': 'MEDIUM', '3': 'HIGH', '4': 'NEVER' },
  'СЮ':   { '1': 'LOW', '2': 'MEDIUM', '3': 'MEDIUM', '4': 'NEVER' },
  'Ю':    { '1': 'LOW', '2': 'MEDIUM', '3': 'LOW', '4': 'NEVER' },
  'В':    { '1': 'LOW', '2': 'MEDIUM', '3': 'LOW', '4': 'NEVER' },
  'Се':   { '1': 'LOW', '2': 'LOW', '3': 'LOW', '4': 'NEVER' },
  'Е':    { '1': 'NEVER', '2': 'MEDIUM', '3': 'MEDIUM', '4': 'LOW' },
};

/**
 * Preferred cutting positions per worker.
 *   Position 1 is handled separately (Ди shift 1 / о.Да shift 2+).
 *   Positions 2: А, ПН
 *   Position 3: СТ, о.А
 *   Positions 5-6: СЛ, СЮ, Е
 */
const PREFERRED_POSITIONS: Record<string, number[]> = {
  'А':    [2],
  'ПН':   [2],
  'СТ':   [3],
  'о.А':  [3],
  'СЛ':   [5, 6],
  'СЮ':   [5, 6],
  'Е':    [5, 6],
};

function getCuttingShiftWeight(worker: string, shift: ShiftKey): number {
  const w = CUTTING_SHIFT_WEIGHTS[worker];
  if (!w) return 0;
  return W[w[shift] ?? 'NEVER'];
}

/**
 * Position affinity factor:
 *   1.0 — preferred position
 *   0.5 — has preferences but this isn't one of them
 *   0.7 — no preferences defined (flexible worker)
 */
function getPositionFactor(worker: string, position: number): number {
  const prefs = PREFERRED_POSITIONS[worker];
  if (!prefs) return 0.7;
  return prefs.includes(position) ? 1.0 : 0.5;
}

/**
 * Returns an array of { position, name } sorted by position for the given
 * day / shift / worker count.
 */
export function getCuttingAssignment(
  day: string,
  shift: ShiftKey,
  count: number = 5,
): { position: number; name: string }[] {
  if (day === 'Суббота' || count <= 0) return [];

  const result: { position: number; name: string }[] = [];
  const used = new Set<string>();

  // ── Position 1: strictly Ди (shift 1, Mon–Fri) or о.Да (otherwise) ──
  if (count >= 1) {
    let pos1 = '';
    if (day === 'Воскресенье') {
      pos1 = 'о.Да'; // Rule 3
    } else if (shift === '1') {
      pos1 = 'Ди';   // Rule 2
    } else {
      pos1 = 'о.Да'; // shift 2+
    }
    if (isAvailableForCutting(pos1, day)) {
      result.push({ position: 1, name: pos1 });
      used.add(pos1);
    } else {
      result.push({ position: 1, name: '' });
    }
  }

  if (count <= 1) return result;

  // ── Positions 2..N: greedy global matching ──
  const matrixOrder = Object.keys(CUTTING_SHIFT_WEIGHTS);
  const candidates: { worker: string; position: number; score: number }[] = [];

  for (const worker of matrixOrder) {
    if (used.has(worker)) continue;
    if (!isAvailableForCutting(worker, day)) continue;
    const shiftW = getCuttingShiftWeight(worker, shift);
    if (shiftW <= 0) continue;

    for (let pos = 2; pos <= count; pos++) {
      candidates.push({
        worker,
        position: pos,
        score: shiftW * getPositionFactor(worker, pos),
      });
    }
  }

  // Sort by score desc, tiebreak by matrix declaration order
  candidates.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return matrixOrder.indexOf(a.worker) - matrixOrder.indexOf(b.worker);
  });

  const assignedPositions = new Set<number>();
  for (const c of candidates) {
    if (used.has(c.worker) || assignedPositions.has(c.position)) continue;
    result.push({ position: c.position, name: c.worker });
    used.add(c.worker);
    assignedPositions.add(c.position);
    if (assignedPositions.size >= count - 1) break;
  }

  // Fill any remaining empty positions
  for (let pos = 2; pos <= count; pos++) {
    if (!assignedPositions.has(pos)) {
      result.push({ position: pos, name: '' });
    }
  }

  return result.sort((a, b) => a.position - b.position);
}

// ──────────────────────────────────────────────────────────────
// Baking (Выпечка)
// ──────────────────────────────────────────────────────────────

const BAKING_WEIGHTS: Record<string, {
  senior: Weight;
  junior: Weight;
  shifts: Partial<Record<ShiftKey, Weight>>;
}> = {
  'Ф':  { senior: 'MUST', junior: 'NEVER', shifts: { '1': 'HIGH', '2': 'LOW', '3': 'NEVER' } },
  'ПГ': { senior: 'MEDIUM', junior: 'MEDIUM', shifts: { '1': 'HIGH', '2': 'HIGH', '3': 'MEDIUM' } },
  'СЮ': { senior: 'LOW', junior: 'HIGH', shifts: { '1': 'LOW', '2': 'HIGH', '3': 'MEDIUM' } },
  'СФ': { senior: 'LOW', junior: 'HIGH', shifts: { '1': 'NEVER', '2': 'HIGH', '3': 'MEDIUM' } },
  'МИ': { senior: 'NEVER', junior: 'HIGH', shifts: { '1': 'NEVER', '2': 'LOW', '3': 'HIGH' } },
  'В':  { senior: 'NEVER', junior: 'MEDIUM', shifts: { '1': 'MEDIUM', '2': 'NEVER', '3': 'NEVER' } },
  'Ю':  { senior: 'LOW', junior: 'MEDIUM', shifts: { '1': 'NEVER', '2': 'MEDIUM', '3': 'LOW' } },
  'Се': { senior: 'LOW', junior: 'MEDIUM', shifts: { '1': 'NEVER', '2': 'MEDIUM', '3': 'LOW' } },
  'Е':  { senior: 'NEVER', junior: 'LOW', shifts: { '1': 'NEVER', '2': 'NEVER', '3': 'LOW' } },
};

/** Rule 4: stable baking pairs per shift. */
const STABLE_PAIRS: Partial<Record<ShiftKey, [string, string][]>> = {
  '1': [['Ф', 'ПГ'], ['Ф', 'В']],
  '2': [['ПГ', 'СФ'], ['ПГ', 'СЮ']],
  '3': [['СФ', 'МИ'], ['Се', 'МИ']],
};

/** Rule 3: Sunday baking pairs (Ф unavailable). */
const SUNDAY_PAIRS: [string, string][] = [
  ['ПГ', 'СФ'],
  ['ПГ', 'СЮ'],
  ['СФ', 'МИ'],
  ['СФ', 'СЮ'],
];

function computeBestPair(
  day: string,
  shift: ShiftKey,
): { senior: string; junior: string } | null {
  const available = Object.entries(BAKING_WEIGHTS)
    .filter(([name]) => isAvailableForBaking(name, day))
    .map(([name, data]) => ({
      name,
      seniorScore: W[data.senior] * W[data.shifts[shift] ?? 'NEVER'],
      juniorScore: W[data.junior] * W[data.shifts[shift] ?? 'NEVER'],
    }));

  let bestSenior = '';
  let bestSeniorScore = 0;
  for (const b of available) {
    if (b.seniorScore > bestSeniorScore) {
      bestSeniorScore = b.seniorScore;
      bestSenior = b.name;
    }
  }

  let bestJunior = '';
  let bestJuniorScore = 0;
  for (const b of available) {
    if (b.name === bestSenior) continue;
    if (b.juniorScore > bestJuniorScore) {
      bestJuniorScore = b.juniorScore;
      bestJunior = b.name;
    }
  }

  if (bestSenior) return { senior: bestSenior, junior: bestJunior };
  return null;
}

export function getBakingAssignment(
  day: string,
  shift: ShiftKey,
): { senior: string; junior: string } | null {
  if (day === 'Суббота') return null;

  // Rule 3: Sunday — Ф unavailable, ПГ available for baking
  if (day === 'Воскресенье') {
    for (const [senior, junior] of SUNDAY_PAIRS) {
      if (isAvailableForBaking(senior, day) && isAvailableForBaking(junior, day)) {
        return { senior, junior };
      }
    }
    return computeBestPair(day, shift);
  }

  // Try stable pairs for this shift first (Rule 4)
  const pairs = STABLE_PAIRS[shift] ?? [];
  for (const [senior, junior] of pairs) {
    if (!isAvailableForBaking(senior, day) || !isAvailableForBaking(junior, day)) continue;
    const seniorData = BAKING_WEIGHTS[senior];
    const juniorData = BAKING_WEIGHTS[junior];
    if (!seniorData || !juniorData) continue;
    if (W[seniorData.shifts[shift] ?? 'NEVER'] > 0 && W[juniorData.shifts[shift] ?? 'NEVER'] > 0) {
      return { senior, junior };
    }
  }

  // Fallback: compute best pair by weights
  return computeBestPair(day, shift);
}

// ──────────────────────────────────────────────────────────────
// Assembly (Сборка) — Rule 5
// ──────────────────────────────────────────────────────────────

const ASSEMBLY_WORKERS: Record<string, string> = {
  'Понедельник': 'СЛ',
  'Среда': 'Е',
  'Воскресенье': '',
};

export function shouldHaveAssembly(day: string): boolean {
  return day in ASSEMBLY_WORKERS;
}

export function getAssemblyWorker(day: string): string {
  return ASSEMBLY_WORKERS[day] ?? '';
}
