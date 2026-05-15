import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { schedulesRouter } from './routes/schedules';
import { templatesRouter } from './routes/templates';
import { workersRouter } from './routes/workers';
import { authRouter } from './routes/auth';
import { importRouter } from './routes/import';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Public routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/schedules', requireAuth, schedulesRouter);
app.use('/api/templates', requireAuth, templatesRouter);
app.use('/api/workers', requireAuth, workersRouter);
app.use('/api/import', requireAuth, importRouter);

// Serve built client in production (Dockerfile copies client/dist to ./public)
const publicDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
