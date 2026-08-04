import { Platform } from 'react-native';

import type { TimelineSegment, WorkoutTimeline } from './workoutTimeline';

/**
 * In-memory audio for generated workouts (this app session only).
 * Keyed by workout slug so multiple workouts can stay warm without Storage.
 *
 * FUTURE (Firebase Storage / Blaze): durable clips behind `voiceAudioUrl` on the
 * workout doc — hydrate into this cache via getWorkoutAudio, leave callers alone.
 */

export type VoiceClip = {
  key: string;
  /** Absolute start time on the workout timeline (seconds). */
  start: number;
  uri: string;
};

export type VoiceSessionPayload = {
  generatedSlug: string;
  format: string;
  createdAt: number;
  timeline: WorkoutTimeline;
  clips: VoiceClip[];
  totalDurationSeconds: number;
};

/** slug → prepared voice session (survives leave/replay until app restarts). */
const sessionsBySlug = new Map<string, VoiceSessionPayload>();

/** Decode base64 mp3 to a playable URI (blob on web, data URI on native). */
export function base64AudioToUri(base64: string, format = 'mp3'): string {
  if (Platform.OS === 'web' && typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: `audio/${format}` });
    return URL.createObjectURL(blob);
  }

  return `data:audio/${format};base64,${base64}`;
}

function revokeUri(uri: string) {
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      // ignore
    }
  }
}

function disposePayload(payload: VoiceSessionPayload) {
  payload.clips.forEach((c) => revokeUri(c.uri));
}

export function setVoiceSession(payload: VoiceSessionPayload): void {
  const previous = sessionsBySlug.get(payload.generatedSlug);
  if (previous && previous !== payload) {
    disposePayload(previous);
  }
  sessionsBySlug.set(payload.generatedSlug, payload);
}

export function peekVoiceSession(
  generatedSlug: string
): VoiceSessionPayload | null {
  return sessionsBySlug.get(generatedSlug) ?? null;
}

/** True when this slug has playable clips in the in-memory session cache. */
export function hasVoiceSessionAudio(generatedSlug: string): boolean {
  const session = sessionsBySlug.get(generatedSlug);
  return Boolean(session && session.clips.length > 0);
}

/**
 * Drop one slug (or all). Rarely needed — prefer keeping sessions for in-session
 * replays without re-charging quota. Call only when intentionally invalidating.
 */
export function clearVoiceSession(generatedSlug?: string): void {
  if (generatedSlug) {
    const existing = sessionsBySlug.get(generatedSlug);
    if (existing) {
      disposePayload(existing);
      sessionsBySlug.delete(generatedSlug);
    }
    return;
  }

  sessionsBySlug.forEach((payload) => disposePayload(payload));
  sessionsBySlug.clear();
}

export type { TimelineSegment, WorkoutTimeline };
