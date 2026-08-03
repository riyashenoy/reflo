import { Platform } from 'react-native';

import type { TimelineSegment, WorkoutTimeline } from './workoutTimeline';

/**
 * In-memory handoff: PrepareSession → LiveWorkout.
 * Holds timed TTS clips + the session timeline (not a glued single track).
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

let cached: VoiceSessionPayload | null = null;

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

export function setVoiceSession(payload: VoiceSessionPayload): void {
  if (cached) {
    cached.clips.forEach((c) => revokeUri(c.uri));
  }
  cached = payload;
}

export function peekVoiceSession(
  generatedSlug: string
): VoiceSessionPayload | null {
  if (!cached || cached.generatedSlug !== generatedSlug) {
    return null;
  }
  return cached;
}

export function clearVoiceSession(generatedSlug?: string): void {
  if (!cached) {
    return;
  }
  if (generatedSlug && cached.generatedSlug !== generatedSlug) {
    return;
  }
  cached.clips.forEach((c) => revokeUri(c.uri));
  cached = null;
}

export type { TimelineSegment, WorkoutTimeline };
