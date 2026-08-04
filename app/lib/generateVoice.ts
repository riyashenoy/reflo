import type { GeneratedWorkoutDoc } from './generatePlan';
import {
  base64AudioToUri,
  hasVoiceSessionAudio,
  peekVoiceSession,
  setVoiceSession,
  type VoiceClip,
  type VoiceSessionPayload,
} from './voiceSessionCache';
import type { WorkoutTimeline } from './workoutTimeline';

const VOICE_TIMEOUT_MS = 120_000;

export type GenerateVoiceResult =
  | {
      ok: true;
      timeline: WorkoutTimeline;
      totalDurationSeconds: number;
    }
  | { ok: false; error: string };

/**
 * Where the audio came from. Callers use this for quota:
 * charge only when `source === 'network'`.
 */
export type WorkoutAudioSource = 'memory' | 'network' | 'storage';

export type WorkoutAudioResult =
  | {
      ok: true;
      source: WorkoutAudioSource;
      session: VoiceSessionPayload;
      timeline: WorkoutTimeline;
      totalDurationSeconds: number;
    }
  | { ok: false; error: string; source?: WorkoutAudioSource };

/**
 * Low-level TTS network call. Prefer {@link getWorkoutAudio} from UI code.
 * Writes the resulting clips into the in-memory session cache.
 */
export async function generateVoice(
  workout: GeneratedWorkoutDoc
): Promise<GenerateVoiceResult> {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId =
    controller &&
    setTimeout(() => {
      controller.abort();
    }, VOICE_TIMEOUT_MS);

  try {
    const response = await fetch('/api/generate-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout: {
          title: workout.title,
          exercises: workout.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            cue: ex.cue,
            repType: ex.repType,
          })),
        },
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        ok: false,
        error: body?.error ?? `Voice generation failed (${response.status})`,
      };
    }

    const data = (await response.json()) as {
      format?: string;
      timeline?: WorkoutTimeline;
      totalDurationSeconds?: number;
      clips?: Array<{
        key: string;
        start: number;
        audio?: string;
      }>;
    };

    if (!data.timeline || !Array.isArray(data.clips) || data.clips.length === 0) {
      return { ok: false, error: 'Invalid voice response (missing timeline)' };
    }

    const format = data.format === 'mp3' || data.format ? data.format! : 'mp3';
    const clips: VoiceClip[] = [];

    for (const clip of data.clips) {
      if (!clip.audio || typeof clip.audio !== 'string') {
        return { ok: false, error: `Missing audio for clip ${clip.key}` };
      }
      clips.push({
        key: clip.key,
        start: typeof clip.start === 'number' ? clip.start : 0,
        uri: base64AudioToUri(clip.audio, format),
      });
    }

    const totalDurationSeconds =
      typeof data.totalDurationSeconds === 'number'
        ? data.totalDurationSeconds
        : data.timeline.totalDurationSeconds;

    setVoiceSession({
      generatedSlug: workout.slug,
      format,
      createdAt: Date.now(),
      timeline: data.timeline,
      clips,
      totalDurationSeconds,
    });

    return {
      ok: true,
      timeline: data.timeline,
      totalDurationSeconds,
    };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('aborted'));
    console.warn('[generateVoice] request failed:', error);
    return {
      ok: false,
      error: aborted
        ? 'Voice generation timed out'
        : 'Voice generation failed',
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/** @deprecated Use {@link generateVoice} or {@link getWorkoutAudio}. */
export const requestGeneratedVoice = generateVoice;

/**
 * Single entry point for preparing playable voice for a generated workout.
 *
 * Callers (PrepareSession, etc.) should use this only — never call TTS APIs
 * directly — so durable caching can drop in without a rewrite.
 *
 * TODO — durable audio cache (not implemented):
 * - Requires Firebase Storage (Blaze plan) + a `voiceAudioUrl` (and related
 *   metadata) on `users/{uid}/generatedWorkouts/{slug}`.
 * - Flow: if doc.voiceAudioUrl is set, download/hydrate clips into the session
 *   cache and return `{ source: 'storage' }` without calling /api/generate-voice
 *   and without incrementing voice quota.
 * - Do not add Storage or change billing until product explicitly enables it.
 *
 * Today:
 * 1) In-memory session cache by slug (replays in same app session, free of quota)
 * 2) Else always generate fresh via network
 */
export async function getWorkoutAudio(
  workout: GeneratedWorkoutDoc
): Promise<WorkoutAudioResult> {
  // FUTURE: if (workout.voiceAudioUrl) { hydrate → return source: 'storage' }

  // In-memory only (this browser/app process) — no Blaze plan needed
  if (hasVoiceSessionAudio(workout.slug)) {
    const session = peekVoiceSession(workout.slug);
    if (session?.clips.length) {
      return {
        ok: true,
        source: 'memory',
        session,
        timeline: session.timeline,
        totalDurationSeconds: session.totalDurationSeconds,
      };
    }
  }

  // Always generate fresh when nothing is warm yet
  const generated = await generateVoice(workout);
  if (!generated.ok) {
    return { ok: false, error: generated.error, source: 'network' };
  }

  const session = peekVoiceSession(workout.slug);
  if (!session) {
    return {
      ok: false,
      error: 'Voice generated but session cache missing',
      source: 'network',
    };
  }

  return {
    ok: true,
    source: 'network',
    session,
    timeline: generated.timeline,
    totalDurationSeconds: generated.totalDurationSeconds,
  };
}
