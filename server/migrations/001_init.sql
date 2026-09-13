-- Reflo Postgres v1: session analytics + thin Firebase user mirror.
-- Identity source of truth remains Firebase Auth (not this table).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  firebase_uid TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS
  'Synced mirror of Firebase Auth users. firebase_uid == Firebase UID. Firebase remains identity source of truth; this row exists only for FKs and server-side joins.';

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  workout_id TEXT,
  workout_source TEXT NOT NULL DEFAULT 'unknown'
    CHECK (workout_source IN ('recorded', 'generated', 'unknown')),
  completed_at TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  correction_count INT NOT NULL DEFAULT 0,
  overall_stars SMALLINT,
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date_key)
);

CREATE INDEX IF NOT EXISTS sessions_user_completed_at_idx
  ON sessions (user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS sessions_user_date_key_idx
  ON sessions (user_id, date_key);

CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  exercise_key TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('correction', 'positive', 'motivation')),
  clip_played TEXT,
  offset_seconds DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_events_user_type_created_idx
  ON session_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS session_events_session_id_idx
  ON session_events (session_id);
