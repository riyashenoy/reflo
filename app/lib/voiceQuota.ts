import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import { getStartOfWeek, toDateKey } from './workoutHistory';

/** Max AI voice generations per calendar week (Sunday–Saturday). */
export const VOICE_GENERATIONS_PER_WEEK = 3;

export type VoiceQuotaState = {
  used: number;
  limit: number;
  remaining: number;
  allowed: boolean;
  weekStartKey: string;
};

function currentWeekStartKey(reference = new Date()): string {
  return toDateKey(getStartOfWeek(reference));
}

/**
 * Read weekly voice generation quota. Resets automatically each week.
 * Flagship recorded classes never touch this counter.
 */
export async function getVoiceQuota(uid: string): Promise<VoiceQuotaState> {
  const weekStartKey = currentWeekStartKey();
  const limit = VOICE_GENERATIONS_PER_WEEK;

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return {
        used: 0,
        limit,
        remaining: limit,
        allowed: true,
        weekStartKey,
      };
    }

    const data = snap.data() as {
      voiceGenerationsThisWeek?: number;
      voiceQuotaWeekStart?: string;
    };

    const storedWeek = data.voiceQuotaWeekStart;
    const usedRaw =
      typeof data.voiceGenerationsThisWeek === 'number'
        ? data.voiceGenerationsThisWeek
        : 0;

    // New week → counter is zero (written on next successful increment)
    const used = storedWeek === weekStartKey ? Math.max(0, usedRaw) : 0;

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      allowed: used < limit,
      weekStartKey,
    };
  } catch (error) {
    console.warn('[voiceQuota] read failed:', error);
    // Fail open for read errors would bypass metering — fail closed.
    return {
      used: limit,
      limit,
      remaining: 0,
      allowed: false,
      weekStartKey,
    };
  }
}

/** Increment only after a successful /api/generate-voice response. */
export async function incrementVoiceQuotaOnSuccess(
  uid: string
): Promise<void> {
  const weekStartKey = currentWeekStartKey();
  const snap = await getDoc(doc(db, 'users', uid));
  const data = (snap.exists() ? snap.data() : {}) as {
    voiceGenerationsThisWeek?: number;
    voiceQuotaWeekStart?: string;
  };

  const used =
    data.voiceQuotaWeekStart === weekStartKey &&
    typeof data.voiceGenerationsThisWeek === 'number'
      ? data.voiceGenerationsThisWeek
      : 0;

  await setDoc(
    doc(db, 'users', uid),
    {
      voiceGenerationsThisWeek: used + 1,
      voiceQuotaWeekStart: weekStartKey,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
