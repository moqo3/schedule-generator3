import type { Schedule, ScheduleBlock } from '@/types/schedule';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function generateBlockText(block: ScheduleBlock): string {
  const lines: string[] = [];

  if (block.isAssemblyBlock) {
    lines.push('Сборка');
    if (block.assemblyWorker || block.assemblyTime) {
      const parts: string[] = [];
      if (block.assemblyWorker) parts.push(block.assemblyWorker);
      if (block.assemblyTime) parts.push(`с ${block.assemblyTime}`);
      lines.push(parts.join(' '));
    }
    return lines.join('\n');
  }

  // Title line: "1 разделка служебные"
  const titleParts: string[] = [];
  if (block.title) titleParts.push(block.title);
  if (block.workType) titleParts.push(block.workType);
  lines.push(titleParts.join(' '));

  // Knead line: "Замес в 6.10 5 Ди"
  if (block.kneadTime || block.kneadCount || block.kneadWorker) {
    const kneadParts = ['Замес'];
    if (block.kneadTime) kneadParts.push(`в ${block.kneadTime}`);
    if (block.kneadCount) kneadParts.push(block.kneadCount);
    if (block.kneadWorker) kneadParts.push(block.kneadWorker);
    lines.push(kneadParts.join(' '));
  }

  // Empty line before cutting
  lines.push('');

  // Cutting section: "Разделка с 8.00"
  if (block.cuttingStartTime) {
    lines.push(`Разделка с ${block.cuttingStartTime}`);
  } else {
    lines.push('Разделка');
  }

  // Cutting workers list
  if (block.cuttingWorkers.length > 0) {
    const sortedWorkers = [...block.cuttingWorkers].sort((a, b) => a.position - b.position);
    for (const worker of sortedWorkers) {
      if (worker.name) {
        lines.push(`${worker.position} ${worker.name}`);
      }
    }
  }

  // Empty line before baking
  lines.push('');

  // Baking section
  if (block.bakingTime) {
    lines.push(`Выпечка с ${block.bakingTime}`);
  } else {
    lines.push('Выпечка');
  }

  // Baking workers
  if (block.bakingWorkers && block.bakingWorkers.length > 0) {
    lines.push(block.bakingWorkers.join('.'));
  }

  // Extra sections
  if (block.extraSections && block.extraSections.trim()) {
    lines.push('');
    lines.push(block.extraSections.trim());
  }

  return lines.join('\n');
}

export function generateTelegramText(schedule: Schedule): string {
  const lines: string[] = [];

  // Header: "06.05 Среда"
  lines.push(`${formatDate(schedule.date)} ${schedule.dayOfWeek}`);
  lines.push('');

  // Blocks separated by "---"
  const blockTexts = schedule.blocks
    .sort((a, b) => a.order - b.order)
    .map(block => generateBlockText(block));

  lines.push(blockTexts.join('\n\n---\n\n'));

  return lines.join('\n');
}
