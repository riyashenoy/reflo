import { doc, getDoc, setDoc } from 'firebase/firestore';

import { getWorkoutById } from '../data/workouts';
import { db } from './firebase';
import type { UserProfile } from './userProfile';
import { getWeekDateKeys } from './workoutHistory';
import {
  saveWeeklySchedule,
  type ScheduledDay,
  type WeeklySchedule,
} from './weeklySchedule';

/** Day keys as returned by /api/generate-plan and stored on plans/weekly. */
export const WEEK_PLAN_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekPlanDayKey = (typeof WEEK_PLAN_DAY_KEYS)[number];

export type WeekPlanMap = Record<WeekPlanDayKey, string>;

export type FirestoreWeeklyPlan = WeekPlanMap & {
  lastGeneratedAt?: string;
};

/** Local week order (Sunday-first), matches getWeekDateKeys. */
const LOCAL_WEEK_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** Evenly spaced training day indices (0 = Sunday) by profile frequency. */
const TRAINING_DAY_INDICES: Record<string, number[]> = {
  '1-2x': [2, 5],
  '3-4x': [1, 2, 4, 5],
  '5-7x': [1, 2, 3, 4, 5, 6],
};

const FALLBACK_WORKOUT_ID = 'sculpt-and-stretch';
const RATE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

function isRestOrKnownWorkout(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }
  if (value === 'rest') {
    return true;
  }
  return getWorkoutById(value) != null;
}

/** Never trust model output — all 7 keys + rest or known workout IDs only. */
export function validateWeekPlan(plan: unknown): plan is WeekPlanMap {
  if (!plan || typeof plan !== 'object') {
    return false;
  }

  const record = plan as Record<string, unknown>;
  for (const key of WEEK_PLAN_DAY_KEYS) {
    if (!isRestOrKnownWorkout(record[key])) {
      return false;
    }
  }

  return true;
}

/** Deterministic evenly spaced plan when AI output fails validation. */
export function buildFallbackWeekPlan(frequency?: string): WeekPlanMap {
  const indices =
    TRAINING_DAY_INDICES[frequency ?? '3-4x'] ?? TRAINING_DAY_INDICES['3-4x'];
  const training = new Set(indices);

  const plan = {} as WeekPlanMap;
  for (let index = 0; index < LOCAL_WEEK_DAY_KEYS.length; index += 1) {
    const dayKey = LOCAL_WEEK_DAY_KEYS[index] as WeekPlanDayKey;
    plan[dayKey] = training.has(index) ? FALLBACK_WORKOUT_ID : 'rest';
  }

  return plan;
}

export function isPlanGenerationRateLimited(lastGeneratedAt?: string): boolean {
  if (!lastGeneratedAt) {
    return false;
  }

  const generatedAt = Date.parse(lastGeneratedAt);
  if (Number.isNaN(generatedAt)) {
    return false;
  }

  return Date.now() - generatedAt < RATE_LIMIT_MS;
}

export async function fetchFirestoreWeeklyPlan(
  uid: string
): Promise<FirestoreWeeklyPlan | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'plans', 'weekly'));
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as FirestoreWeeklyPlan;
}

export async function writeFirestoreWeeklyPlan(
  uid: string,
  plan: WeekPlanMap
): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'plans', 'weekly'), {
    ...plan,
    lastGeneratedAt: new Date().toISOString(),
  });
}

/** Map day-name plan → current week’s date rows for the Calendar UI. */
export function weekPlanToSchedule(
  plan: WeekPlanMap,
  reference = new Date()
): WeeklySchedule {
  const weekDateKeys = getWeekDateKeys(reference);
  const days: ScheduledDay[] = weekDateKeys.map((dateKey, index) => {
    const dayKey = LOCAL_WEEK_DAY_KEYS[index] as WeekPlanDayKey;
    const value = plan[dayKey] ?? 'rest';

    if (value === 'rest') {
      return {
        dateKey,
        libraryId: null,
        workoutId: null,
        isRestDay: true,
      };
    }

    return {
      dateKey,
      libraryId: null,
      workoutId: value,
      isRestDay: false,
    };
  });

  return {
    weekStartKey: weekDateKeys[0],
    generatedAt: new Date().toISOString(),
    days,
  };
}

export async function applyWeekPlanToLocalSchedule(
  plan: WeekPlanMap,
  reference = new Date()
): Promise<WeeklySchedule> {
  const schedule = weekPlanToSchedule(plan, reference);
  await saveWeeklySchedule(schedule);
  return schedule;
}

export type GeneratePlanResult =
  | { ok: true; plan: WeekPlanMap; source: 'ai' | 'fallback' }
  | { ok: false; reason: 'rate_limited' | 'network' | 'unauthenticated' | 'no_profile' };

/**
 * POST /api/generate-plan, validate, fall back locally if needed, write Firestore + local schedule.
 * Does not throw for validation failure (silent fallback). Network failure → ok: false.
 */
export async function generateAndSaveWeeklyPlan(
  uid: string,
  profile: UserProfile
): Promise<GeneratePlanResult> {
  const existing = await fetchFirestoreWeeklyPlan(uid);
  if (isPlanGenerationRateLimited(existing?.lastGeneratedAt)) {
    return { ok: false, reason: 'rate_limited' };
  }

  let plan: WeekPlanMap | null = null;
  let source: 'ai' | 'fallback' = 'fallback';

  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: profile.goals ?? [],
        frequency: profile.trainingFrequency ?? '3-4x',
        experienceLevel: profile.experienceLevel ?? 'Beginner',
        mindfulAreas: profile.mindfulAreas ?? [],
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: 'network' };
    }

    const data = (await response.json()) as { plan?: unknown };
    if (validateWeekPlan(data.plan)) {
      plan = data.plan;
      source = 'ai';
    } else {
      plan = buildFallbackWeekPlan(profile.trainingFrequency);
      source = 'fallback';
    }
  } catch (error) {
    console.warn('[generatePlan] network failure:', error);
    return { ok: false, reason: 'network' };
  }

  await writeFirestoreWeeklyPlan(uid, plan);
  await applyWeekPlanToLocalSchedule(plan);

  return { ok: true, plan, source };
}
