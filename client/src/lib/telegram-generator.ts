import type { Schedule, ScheduleBlock } from '@/types/schedule';

const KEYCAP_DIGITS = ['0⃣','1⃣','2⃣','3⃣','4⃣','5⃣','6⃣','7⃣','8⃣','9⃣','🔟'];

function keycap(n: number): string {
  if (n >= 1 && n <= 10) return KEYCAP_DIGITS[n];
  return `${n}.`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function fmtTime(time: string): string {
  if (!time) return '';
  const normalized = time.replace(':', '.');
  return normalized.replace(/^0(\d)/, '$1');
}

function generateBlockText(block: ScheduleBlock): string {
  const lines: string[] = [];

  if (block.isAssemblyBlock) {
    const parts = ['Сборка 📦'];
    if (block.assemblyTime) parts.push(`с ${fmtTime(block.assemblyTime)}`);
    if (block.assemblyWorker) parts.push(block.assemblyWorker);
    lines.push(parts.join(' '));
    return lines.join('\n');
  }

  // Title: "1 разделка служебные"
  const titleParts: string[] = [];
  if (block.title) titleParts.push(block.title);
  if (block.workType) titleParts.push(block.workType.toLowerCase());
  lines.push(titleParts.join(' '));

  // Knead: "🫗Замес в 6.10 5 Ди"
  if (block.kneadTime || block.kneadCount || block.kneadWorker) {
    const kneadParts = ['🫗Замес'];
    if (block.kneadTime) kneadParts.push(`в ${fmtTime(block.kneadTime)}`);
    if (block.kneadCount) kneadParts.push(block.kneadCount);
    if (block.kneadWorker) kneadParts.push(block.kneadWorker);
    lines.push(kneadParts.join(' '));
  }

  // Cutting: "🫔Разделка с 8.00"
  if (block.cuttingStartTime) {
    lines.push(`🫔Разделка с ${fmtTime(block.cuttingStartTime)}`);
  } else {
    lines.push('🫔Разделка');
  }

  // Cutting workers: "1⃣Ди2⃣А3⃣Ф4⃣С5⃣Де"
  if (block.cuttingWorkers.length > 0) {
    const sorted = [...block.cuttingWorkers]
      .sort((a, b) => a.position - b.position)
      .filter(w => w.name);
    if (sorted.length > 0) {
      const workerStr = sorted.map(w => `${keycap(w.position)}${w.name}`).join('');
      lines.push(workerStr);
    }
  }

  // Baking: "🥖Выпечка с 11.00 Ф.ПГ"
  const bakingParts = ['🥖Выпечка'];
  if (block.bakingTime) bakingParts.push(`с ${fmtTime(block.bakingTime)}`);
  if (block.bakingWorkers && block.bakingWorkers.length > 0) {
    bakingParts.push(block.bakingWorkers.join('.'));
  }
  lines.push(bakingParts.join(' '));

  // Extra sections
  if (block.extraSections && block.extraSections.trim()) {
    lines.push(block.extraSections.trim());
  }

  return lines.join('\n');
}

export function generateTelegramText(schedule: Schedule): string {
  const lines: string[] = [];

  // Header: "25.05 Понедельник"
  lines.push(`${formatDate(schedule.date)} ${schedule.dayOfWeek}`);

  // Blocks separated by empty line
  const blockTexts = schedule.blocks
    .sort((a, b) => a.order - b.order)
    .map(block => generateBlockText(block));

  lines.push(blockTexts.join('\n\n'));

  return lines.join('\n');
}
