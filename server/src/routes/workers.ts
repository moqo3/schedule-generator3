import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const workersRouter = Router();

// GET all workers
workersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(workers);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

/** Sentinel: returned when input was not provided (do not touch the column). */
const NO_CHANGE = Symbol('NO_CHANGE');
type Normalized = Prisma.InputJsonValue | typeof Prisma.DbNull | typeof NO_CHANGE;

/**
 * Parse `defaultPositions` map. Allowed keys: "1"|"2"|"3"; values must be
 * positive integers. Empty/invalid entries are dropped. Returns Prisma.DbNull
 * to clear the column, or NO_CHANGE when the field was not present in input.
 */
function normalizeDefaultPositions(value: unknown): Normalized {
  if (value === undefined) return NO_CHANGE;
  if (value === null) return Prisma.DbNull;
  if (typeof value !== 'object') return Prisma.DbNull;
  const src = value as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const shift of ['1', '2', '3']) {
    const v = src[shift];
    if (v === null || v === undefined || v === '') continue;
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (Number.isFinite(n) && n >= 1) out[shift] = n;
  }
  return Object.keys(out).length === 0 ? Prisma.DbNull : out;
}

// POST create worker
workersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, shortName, position, defaultPositions } = req.body;
    if (!name || !shortName) {
      res.status(400).json({ error: 'Name and shortName are required' });
      return;
    }
    const dp = normalizeDefaultPositions(defaultPositions);
    const worker = await prisma.worker.create({
      data: {
        name,
        shortName,
        position,
        ...(dp !== NO_CHANGE && { defaultPositions: dp }),
      },
    });
    res.status(201).json(worker);
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

// PUT update worker
workersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, shortName, position, defaultPositions } = req.body;
    const dp = normalizeDefaultPositions(defaultPositions);
    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(shortName !== undefined && { shortName }),
        ...(position !== undefined && { position }),
        ...(dp !== NO_CHANGE && { defaultPositions: dp }),
      },
    });
    res.json(worker);
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({ error: 'Failed to update worker' });
  }
});

// DELETE worker
workersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.worker.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting worker:', error);
    res.status(500).json({ error: 'Failed to delete worker' });
  }
});
