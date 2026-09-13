/**
 * Identity ownership
 * ------------------
 * Firebase Auth is the source of truth for who a user is (UID, email, credentials).
 * Postgres `users` is a *synced mirror* keyed by that Firebase UID. It exists so
 * sessions/events can use foreign keys — it does not replace Firebase Auth.
 *
 * When the mirror is created/updated
 * ----------------------------------
 * `requireAuth` runs on every authenticated request. After a Firebase ID token is
 * verified, it upserts `users` with firebase_uid (+ email when present). First
 * authenticated hit creates the row; later hits refresh email/updated_at.
 */

import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { ensureUserMirror } from '../services/usersService.js';

export type AuthedRequest = Request & {
  user: {
    uid: string;
    email?: string;
  };
};

export function getAuthedUser(req: Request): AuthedRequest['user'] {
  return (req as AuthedRequest).user;
}

let app: App | null = null;

function getFirebaseApp(): App {
  if (app) {
    return app;
  }

  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }

  const { projectId, clientEmail, privateKey } = env.firebase;

  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
    return app;
  }

  // ADC / GOOGLE_APPLICATION_CREDENTIALS
  app = initializeApp({
    projectId: projectId || undefined,
  });
  return app;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing Authorization Bearer token (Firebase ID token required).',
    });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty Bearer token.' });
  }

  try {
    const decoded = await getAuth(getFirebaseApp()).verifyIdToken(token);

    // Mirror upsert: Firebase UID is authoritative; Postgres only mirrors it.
    await ensureUserMirror({
      firebaseUid: decoded.uid,
      email: decoded.email,
    });

    (req as AuthedRequest).user = {
      uid: decoded.uid,
      email: decoded.email,
    };
    return next();
  } catch (error) {
    console.warn('[auth] token verify failed:', error);
    return res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
  }
}
