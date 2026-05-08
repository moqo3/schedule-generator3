interface Worker {
  id: string;
  position: number;
  name: string;
}

interface ScheduleBlock {
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
  bakingWorkers: string | string[];
  assemblyWorker: string;
  assemblyTime: string;
  isAssemblyBlock: boolean;
  extraSections: string;
}

interface ScheduleData {
  date: string;
  dayOfWeek: string;
  blocks: unknown;
}

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

  const titleParts: string[] = [];
  if (block.title) titleParts.push(block.title);
  if (block.workType) titleParts.push(block.workType);
  lines.push(titleParts.join(' '));

  if (block.kneadTime || block.kneadCount || block.kneadWorker) {
    const kneadParts = ['Замес'];
    if (block.kneadTime) kneadParts.push(`в ${block.kneadTime}`);
    if (block.kneadCount) kneadParts.push(block.kneadCount);
    if (block.kneadWorker) kneadParts.push(block.kneadWorker);
    lines.push(kneadParts.join(' '));
  }

  lines.push('');

  if (block.cuttingStartTime) {
    lines.push(`Разделка с ${block.cuttingStartTime}`);
  } else {
    lines.push('Разделка');
  }

  if (block.cuttingWorkers && block.cuttingWorkers.length > 0) {
    const sortedWorkers = [...block.cuttingWorkers].sort((a, b) => a.position - b.position);
    for (const worker of sortedWorkers) {
      if (worker.name) {
        lines.push(`${worker.position} ${worker.name}`);
      }
    }
  }

  lines.push('');

  if (block.bakingTime) {
    lines.push(`Выпечка с ${block.bakingTime}`);
  } else {
    lines.push('Выпечка');
  }

  if (block.bakingWorkers) {
    if (Array.isArray(block.bakingWorkers)) {
      if (block.bakingWorkers.length > 0) {
        lines.push(block.bakingWorkers.join('.'));
      }
    } else {
      lines.push(block.bakingWorkers);
    }
  }

  if (block.extraSections && block.extraSections.trim()) {
    lines.push('');
    lines.push(block.extraSections.trim());
  }

  return lines.join('\n');
}

export function generateTelegramText(schedule: ScheduleData): string {
  const lines: string[] = [];
  const blocks = schedule.blocks as ScheduleBlock[];

  lines.push(`${formatDate(schedule.date)} ${schedule.dayOfWeek}`);
  lines.push('');

  const blockTexts = blocks
    .sort((a, b) => a.order - b.order)
    .map(block => generateBlockText(block));

  lines.push(blockTexts.join('\n\n---\n\n'));

  return lines.join('\n');
}
