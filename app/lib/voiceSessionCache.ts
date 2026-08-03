import { Platform } from 'react-native';

/**
 * In-memory handoff: PrepareSession → LiveWorkout.
 * Avoids stuffing multi-MB base64 into navigation params.
 */

export type VoiceSessionPayload = {
  generatedSlug: string;
  uri: string;
  format: string;
  createdAt: number;
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

  // expo-av accepts data URIs on iOS/Android
  return `data:audio/${format};base64,${base64}`;
}

export function setVoiceSession(payload: VoiceSessionPayload): void {
  if (cached?.uri && cached.uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(cached.uri);
    } catch {
      // ignore
    }
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

export function takeVoiceSession(
  generatedSlug: string
): VoiceSessionPayload | null {
  if (!cached || cached.generatedSlug !== generatedSlug) {
    return null;
  }
  const session = cached;
  return session;
}

export function clearVoiceSession(generatedSlug?: string): void {
  if (!cached) {
    return;
  }
  if (generatedSlug && cached.generatedSlug !== generatedSlug) {
    return;
  }
  if (cached.uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(cached.uri);
    } catch {
      // ignore
    }
  }
  cached = null;
}
