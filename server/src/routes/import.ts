import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  parseTelegramSchedules,
  extractWorkerRecords,
  computeWorkerStats,
  computeDefaultPositions,
  type ParsedSchedule,
  type WorkerStats,
} from '../lib/telegram-parser';

export const importRouter = Router();

/**
 * POST /api/import/analyze
 * Body: { text: string }
 * Parses Telegram schedule text and returns analytics:
 * - parsed schedules (count, dates)
 * - worker stats (frequency per shift/position)
 * - suggested default positions
 */
importRouter.post('/analyze', (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const schedules = parseTelegramSchedules(text);
  if (schedules.length === 0) {
    res.status(400).json({ error: 'No schedules found in text' });
    return;
  }

  const records = extractWorkerRecords(schedules);
  const stats = computeWorkerStats(records);
  const defaults = computeDefaultPositions(records);

  const defaultsObj: Record<string, Partial<Record<'1' | '2' | '3', number>>> = {};
  for (const [name, positions] of defaults) {
    defaultsObj[name] = positions;
  }

  res.json({
    schedulesCount: schedules.length,
    dateRange: {
      from: schedules[0].date,
      to: schedules[schedules.length - 1].date,
    },
    totalRecords: records.length,
    workerStats: stats,
    suggestedDefaults: defaultsObj,
  });
});

/**
 * POST /api/import/apply-defaults
 * Body: { defaults: Record<string, Partial<Record<'1'|'2'|'3', number>>> }
 * Creates missing workers and updates defaultPositions for existing ones.
 */
importRouter.post('/apply-defaults', async (req: Request, res: Response) => {
  const { defaults } = req.body as {
    defaults?: Record<string, Partial<Record<'1' | '2' | '3', number>>>;
  };
  if (!defaults || typeof defaults !== 'object') {
    res.status(400).json({ error: 'defaults is required' });
    return;
  }

  try {
    const existingWorkers = await prisma.worker.findMany();
    const byShortName = new Map(existingWorkers.map(w => [w.shortName, w]));

    const created: string[] = [];
    const updated: string[] = [];

    for (const [shortName, positions] of Object.entries(defaults)) {
      const existing = byShortName.get(shortName);
      if (existing) {
        await prisma.worker.update({
          where: { id: existing.id },
          data: { defaultPositions: positions },
        });
        updated.push(shortName);
      } else {
        await prisma.worker.create({
          data: {
            name: shortName,
            shortName,
            defaultPositions: positions,
          },
        });
        created.push(shortName);
      }
    }

    res.json({ created, updated });
  } catch (error) {
    console.error('Error applying defaults:', error);
    res.status(500).json({ error: 'Failed to apply defaults' });
  }
});

/**
 * POST /api/import/schedules
 * Body: { text: string }
 * Parses Telegram text and imports schedules into the database.
 */
importRouter.post('/schedules', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const parsed = parseTelegramSchedules(text);
  if (parsed.length === 0) {
    res.status(400).json({ error: 'No schedules found in text' });
    return;
  }

  try {
    const imported: { id: string; date: string; dayOfWeek: string }[] = [];

    for (const schedule of parsed) {
      const blocks = schedule.blocks.map((b, i) => ({
        id: crypto.randomUUID(),
        order: i + 1,
        title: b.title,
        workType: b.workType,
        isAssemblyBlock: b.isAssemblyBlock,
        kneadTime: b.kneadTime,
        kneadCount: b.kneadCount,
        kneadWorker: b.kneadWorker,
        cuttingStartTime: b.cuttingStartTime,
        cuttingWorkers: b.cuttingWorkers.map(w => ({
          id: crypto.randomUUID(),
          position: w.position,
          name: w.name,
        })),
        bakingTime: b.bakingTime,
        bakingWorkers: b.bakingWorkers,
        assemblyWorker: b.assemblyWorker,
        assemblyTime: b.assemblyTime,
        extraSections: b.extraSections,
      }));

      const created = await prisma.schedule.create({
        data: {
          date: schedule.date,
          dayOfWeek: schedule.dayOfWeek,
          blocks: blocks,
          isDraft: false,
        },
      });
      imported.push({ id: created.id, date: created.date, dayOfWeek: created.dayOfWeek });
    }

    res.status(201).json({ imported, count: imported.length });
  } catch (error) {
    console.error('Error importing schedules:', error);
    res.status(500).json({ error: 'Failed to import schedules' });
  }
});
