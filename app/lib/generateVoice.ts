import type { GeneratedWorkoutDoc } from './generatePlan';
import {
  base64AudioToUri,
  setVoiceSession,
  type VoiceClip,
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
 * POST workout to /api/generate-voice.
 * Decodes timed clips + timeline into the voice session cache for LiveWorkout.
 */
export async function requestGeneratedVoice(
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
