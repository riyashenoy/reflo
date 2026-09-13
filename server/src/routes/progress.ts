import { Router } from 'express';

import { getAuthedUser } from '../middleware/firebaseAuth.js';
import {
  getProgressSummary,
  type ProgressPeriod,
} from '../services/progressService.js';

export const progressRouter = Router();

progressRouter.get('/summary', async (req, res, next) => {
  try {
    const { uid } = getAuthedUser(req);
    const raw = String(req.query.period || 'week').toLowerCase();
    const period: ProgressPeriod =
      raw === 'month' || raw === 'all' || raw === 'week' ? raw : 'week';

    const summary = await getProgressSummary(uid, period);
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});
