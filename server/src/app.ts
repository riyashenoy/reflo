import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth } from './middleware/firebaseAuth.js';
import { healthRouter } from './routes/health.js';
import { progressRouter } from './routes/progress.js';
import { sessionsRouter } from './routes/sessions.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // All /api/v1/* business routes require a Firebase ID token.
  // requireAuth also upserts the Postgres users mirror for that Firebase UID.
  app.use('/api/v1/users', requireAuth, usersRouter);
  app.use('/api/v1/sessions', requireAuth, sessionsRouter);
  app.use('/api/v1/progress', requireAuth, progressRouter);

  app.use(errorHandler);
  return app;
}
