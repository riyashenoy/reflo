import type { GeneratedWorkoutDoc } from './generatePlan';
import {
  base64AudioToUri,
  setVoiceSession,
} from './voiceSessionCache';

const VOICE_TIMEOUT_MS = 90_000;

export type GenerateVoiceResult =
  | { ok: true; uri: string; format: string }
  | { ok: false; error: string };

/**
 * POST workout to /api/generate-voice, decode audio, cache for LiveWorkout.
 * Does not touch quota — caller enforces + increments on success only.
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
      audio?: string;
      format?: string;
    };

    if (!data.audio || typeof data.audio !== 'string') {
      return { ok: false, error: 'Empty audio response' };
    }

    const format = data.format === 'mp3' || data.format ? data.format : 'mp3';
    const uri = base64AudioToUri(data.audio, format);

    setVoiceSession({
      generatedSlug: workout.slug,
      uri,
      format,
      createdAt: Date.now(),
    });

    return { ok: true, uri, format };
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
