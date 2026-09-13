import { Router } from 'express';

import type { AuthedRequest } from '../middleware/firebaseAuth.js';
import { getAuthedUser } from '../middleware/firebaseAuth.js';
import {
  deleteSession,
  getSessionByDateKey,
  listSessions,
  upsertSession,
} from '../services/sessionsService.js';
import { upsertSessionSchema } from '../types/session.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const { uid } = getAuthedUser(req);
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const rows = await listSessions(uid, { from, to });
    return res.json({
      sessions: rows.map((row) => ({
        id: row.date_key,
        workoutId: row.workout_id,
        workoutSource: row.workout_source,
        completedAt: row.completed_at,
        durationSeconds: row.duration_seconds,
        correctionCount: row.correction_count,
        overallStars: row.overall_stars,
        ratings: row.ratings,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

sessionsRouter.get('/:dateKey', async (req, res, next) => {
  try {
    const { uid } = getAuthedUser(req);
    const session = await getSessionByDateKey(uid, req.params.dateKey);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.json({
      id: session.date_key,
      workoutId: session.workout_id,
      workoutSource: session.workout_source,
      completedAt: session.completed_at,
      durationSeconds: session.duration_seconds,
      correctionCount: session.correction_count,
      overallStars: session.overall_stars,
      ratings: session.ratings,
      sessionLog: session.sessionLog,
    });
  } catch (error) {
    return next(error);
  }
});

sessionsRouter.post('/', async (req, res, next) => {
  try {
    const { uid } = getAuthedUser(req);
    const parsed = upsertSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid session payload',
        details: parsed.error.flatten(),
      });
    }

    const session = await upsertSession(uid, parsed.data);
    return res.status(201).json({
      id: session.date_key,
      workoutId: session.workout_id,
      workoutSource: session.workout_source,
      completedAt: session.completed_at,
      durationSeconds: session.duration_seconds,
      correctionCount: session.correction_count,
      overallStars: session.overall_stars,
      ratings: session.ratings,
    });
  } catch (error) {
    return next(error);
  }
});

sessionsRouter.delete('/:dateKey', async (req, res, next) => {
  try {
    const { uid } = getAuthedUser(req);
    const deleted = await deleteSession(uid, req.params.dateKey);
    if (!deleted) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
