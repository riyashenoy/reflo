import { query } from '../config/db.js';

/**
 * Upsert the Postgres users mirror for a Firebase Auth user.
 *
 * Ownership: Firebase Auth owns identity. This function never creates a Firebase
 * user — it only ensures a Postgres row exists for FK targets after a valid
 * Firebase ID token has already been verified.
 */
export async function ensureUserMirror(input: {
  firebaseUid: string;
  email?: string | null;
}) {
  const email = input.email?.trim() || null;

  await query(
    `
    INSERT INTO users (firebase_uid, email, created_at, updated_at)
    VALUES ($1, $2, now(), now())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      updated_at = now()
    `,
    [input.firebaseUid, email]
  );
}

export async function getUserMirror(firebaseUid: string) {
  const result = await query<{
    firebase_uid: string;
    email: string | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `
    SELECT firebase_uid, email, created_at, updated_at
    FROM users
    WHERE firebase_uid = $1
    `,
    [firebaseUid]
  );

  return result.rows[0] ?? null;
}
