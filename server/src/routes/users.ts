import { Router } from 'express';

import { getAuthedUser } from '../middleware/firebaseAuth.js';
import { getUserMirror } from '../services/usersService.js';

export const usersRouter = Router();

/**
 * GET /api/v1/users/me
 * Returns the Postgres mirror row. The row is created/updated by requireAuth
 * before this handler runs (Firebase ID token already verified).
 */
usersRouter.get('/me', async (req, res, next) => {
  try {
    const { uid } = getAuthedUser(req);
    const row = await getUserMirror(uid);
    if (!row) {
      // Should be unreachable after requireAuth upsert — surfaces misconfig.
      return res.status(404).json({
        error: 'User mirror missing after auth. Check DATABASE_URL / migrations.',
      });
    }

    return res.json({
      firebaseUid: row.firebase_uid,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      identitySource: 'firebase_auth',
      mirrorRole:
        'Postgres FK anchor only. Firebase Auth remains source of truth for identity.',
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/v1/users/me
 * Explicit mirror sync (same as the automatic upsert in requireAuth).
 * Useful right after login to force a refresh of email on the mirror row.
 */
usersRouter.post('/me', async (req, res, next) => {
  try {
    const { uid, email } = getAuthedUser(req);
    const row = await getUserMirror(uid);
    return res.status(200).json({
      firebaseUid: uid,
      email: row?.email ?? email ?? null,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
      identitySource: 'firebase_auth',
      synced: true,
    });
  } catch (error) {
    return next(error);
  }
});
