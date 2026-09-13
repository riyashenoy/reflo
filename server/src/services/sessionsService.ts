import { pool, query } from '../config/db.js';
import type { SessionEventInput, UpsertSessionInput } from '../types/session.js';

export type SessionRow = {
  id: string;
  user_id: string;
  date_key: string;
  workout_id: string | null;
  workout_source: string;
  completed_at: Date;
  duration_seconds: number;
  correction_count: number;
  overall_stars: number | null;
  ratings: Record<string, string>;
};

function inferWorkoutSource(
  workoutId: string | null | undefined,
  explicit?: UpsertSessionInput['workoutSource']
): string {
  if (explicit) {
    return explicit;
  }
  if (!workoutId) {
    return 'unknown';
  }
  // Generated slugs in this app are typically not the flagship id.
  if (workoutId === 'full-body-burn') {
    return 'recorded';
  }
  return 'generated';
}

export async function upsertSession(
  userId: string,
  input: UpsertSessionInput
): Promise<SessionRow> {
  const sessionLog = input.sessionLog ?? [];
  const correctionCount =
    input.correctionCount ??
    sessionLog.filter((entry) => entry.type === 'correction').length;
  const completedAt = input.completedAt ?? new Date().toISOString();
  const workoutSource = inferWorkoutSource(input.workoutId, input.workoutSource);
  const ratings = input.ratings ?? {};

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const upserted = await client.query<SessionRow>(
      `
      INSERT INTO sessions (
        user_id, date_key, workout_id, workout_source, completed_at,
        duration_seconds, correction_count, overall_stars, ratings, updated_at
      )
      VALUES ($1, $2::date, $3, $4, $5::timestamptz, $6, $7, $8, $9::jsonb, now())
      ON CONFLICT (user_id, date_key) DO UPDATE SET
        workout_id = EXCLUDED.workout_id,
        workout_source = EXCLUDED.workout_source,
        completed_at = EXCLUDED.completed_at,
        duration_seconds = EXCLUDED.duration_seconds,
        correction_count = EXCLUDED.correction_count,
        overall_stars = EXCLUDED.overall_stars,
        ratings = EXCLUDED.ratings,
        updated_at = now()
      RETURNING
        id, user_id, date_key::text, workout_id, workout_source, completed_at,
        duration_seconds, correction_count, overall_stars, ratings
      `,
      [
        userId,
        input.dateKey,
        input.workoutId ?? null,
        workoutSource,
        completedAt,
        input.durationSeconds ?? 0,
        correctionCount,
        input.overallStars ?? null,
        JSON.stringify(ratings),
      ]
    );

    const session = upserted.rows[0];
    if (!session) {
      throw new Error('Session upsert returned no row');
    }

    await client.query(`DELETE FROM session_events WHERE session_id = $1`, [
      session.id,
    ]);

    for (const event of sessionLog) {
      await insertEvent(client, session.id, userId, event);
    }

    await client.query('COMMIT');
    return session;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertEvent(
  client: { query: (text: string, params?: unknown[]) => Promise<unknown> },
  sessionId: string,
  userId: string,
  event: SessionEventInput
) {
  await client.query(
    `
    INSERT INTO session_events (
      session_id, user_id, exercise_key, event_type, clip_played, offset_seconds
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      sessionId,
      userId,
      event.exercise,
      event.type,
      event.clipPlayed ?? null,
      event.timestamp ?? null,
    ]
  );
}

export async function listSessions(
  userId: string,
  options?: { from?: string; to?: string }
) {
  const params: unknown[] = [userId];
  const filters = ['user_id = $1'];

  if (options?.from) {
    params.push(options.from);
    filters.push(`date_key >= $${params.length}::date`);
  }
  if (options?.to) {
    params.push(options.to);
    filters.push(`date_key <= $${params.length}::date`);
  }

  const result = await query<SessionRow>(
    `
    SELECT
      id, user_id, date_key::text, workout_id, workout_source, completed_at,
      duration_seconds, correction_count, overall_stars, ratings
    FROM sessions
    WHERE ${filters.join(' AND ')}
    ORDER BY date_key ASC
    `,
    params
  );

  return result.rows;
}

export async function getSessionByDateKey(userId: string, dateKey: string) {
  const sessions = await listSessions(userId, { from: dateKey, to: dateKey });
  const session = sessions[0];
  if (!session) {
    return null;
  }

  const events = await query<{
    exercise_key: string;
    event_type: string;
    clip_played: string | null;
    offset_seconds: number | null;
  }>(
    `
    SELECT exercise_key, event_type, clip_played, offset_seconds
    FROM session_events
    WHERE session_id = $1
    ORDER BY offset_seconds NULLS LAST, created_at ASC
    `,
    [session.id]
  );

  return {
    ...session,
    sessionLog: events.rows.map((row) => ({
      exercise: row.exercise_key,
      type: row.event_type,
      clipPlayed: row.clip_played ?? '',
      timestamp: row.offset_seconds ?? 0,
    })),
  };
}

export async function deleteSession(userId: string, dateKey: string) {
  const result = await query(
    `DELETE FROM sessions WHERE user_id = $1 AND date_key = $2::date RETURNING id`,
    [userId, dateKey]
  );
  return (result.rowCount ?? 0) > 0;
}
