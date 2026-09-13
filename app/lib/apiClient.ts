/**
 * Optional Express API client (session analytics backend).
 *
 * Enabled only when EXPO_PUBLIC_API_URL is set (e.g. http://localhost:8787).
 * Identity still comes from Firebase Auth — we attach a Firebase ID token;
 * the server verifies it and upserts the Postgres users mirror.
 *
 * Soft-fails when the API is unreachable so Firestore-only mode keeps working.
 */

import { auth } from './firebase';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export function isApiConfigured(): boolean {
  return API_BASE.length > 0;
}

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  try {
    return await user.getIdToken();
  } catch (error) {
    console.warn('[apiClient] getIdToken failed:', error);
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  if (!isApiConfigured()) {
    return { ok: false, error: 'API URL not configured' };
  }

  const token = await getIdToken();
  if (!token) {
    return { ok: false, error: 'Not signed in' };
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        ok: false,
        error: `API ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export type ApiSessionPayload = {
  dateKey: string;
  workoutId?: string | null;
  workoutSource?: 'recorded' | 'generated' | 'unknown';
  completedAt?: string;
  durationSeconds?: number;
  correctionCount?: number;
  overallStars?: number | null;
  ratings?: Record<string, string>;
  sessionLog?: Array<{
    exercise: string;
    clipPlayed?: string | null;
    timestamp?: number | null;
    type: 'correction' | 'positive' | 'motivation';
  }>;
};

/** Dual-write target for PostWorkout. Soft-fails if API is down. */
export async function postSessionToApi(
  payload: ApiSessionPayload
): Promise<boolean> {
  const result = await apiFetch('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!result.ok) {
    console.warn('[apiClient] postSession soft-fail:', result.error);
    return false;
  }
  return true;
}

export type ApiProgressSummary = {
  hasData: boolean;
  sessions: number;
  totalTime: string;
  averageStars: string;
  mostCommon: string;
  chartPoints: Array<{ dateKey: string; label: string; score: number }>;
};

export async function fetchProgressSummaryFromApi(
  period: 'week' | 'month' | 'all'
): Promise<ApiProgressSummary | null> {
  const result = await apiFetch<ApiProgressSummary>(
    `/api/v1/progress/summary?period=${period}`
  );
  if (!result.ok) {
    console.warn('[apiClient] progress soft-fail:', result.error);
    return null;
  }
  return result.data;
}

export type ApiSessionListItem = {
  id: string;
  workoutId: string | null;
  workoutSource: string;
  completedAt: string;
  durationSeconds: number;
  correctionCount: number;
  overallStars: number | null;
  ratings: Record<string, string>;
};

export async function fetchSessionsFromApi(): Promise<ApiSessionListItem[] | null> {
  const result = await apiFetch<{ sessions: ApiSessionListItem[] }>(
    '/api/v1/sessions'
  );
  if (!result.ok) {
    console.warn('[apiClient] sessions soft-fail:', result.error);
    return null;
  }
  return result.data.sessions;
}

/** Call after login to ensure the Postgres users mirror exists. Soft-fails. */
export async function syncUserMirror(): Promise<void> {
  const result = await apiFetch('/api/v1/users/me', { method: 'POST' });
  if (!result.ok) {
    console.warn('[apiClient] user mirror sync soft-fail:', result.error);
  }
}
