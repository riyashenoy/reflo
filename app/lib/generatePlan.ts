import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

import {
  getExerciseById,
  getExerciseCatalog,
  type Exercise,
} from '../data/exercises';
import { db } from './firebase';
import type { UserProfile } from './userProfile';
import { getWeekDateKeys } from './workoutHistory';
import {
  saveWeeklySchedule,
  type ScheduledDay,
  type WeeklySchedule,
} from './weeklySchedule';

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

export type ScheduleDayEntry =
  | { type: 'rest' }
  | {
      type: 'workout';
      workoutSlug: string;
      title?: string;
      focus?: string;
      estimatedDuration?: number;
    };

export type WeeklyPlanSchedule = Record<WeekPlanDayKey, ScheduleDayEntry>;

export type ComposedExerciseRef = {
  id: string;
  sets: number;
  reps: number;
};

export type ResolvedGeneratedExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repType: Exercise['repType'];
  springSetting: string;
  cue: string;
  tracked: boolean;
  estimatedSeconds: number;
  equipment: Exercise['equipment'];
  targetAreas: string[];
  difficulty: Exercise['difficulty'];
};

export type GeneratedWorkoutDoc = {
  slug: string;
  title: string;
  focus: string;
  intensity: 'low' | 'medium' | 'high';
  voiceMode: 'generated';
  correctionMode: 'interval';
  estimatedDuration: number;
  exercises: ResolvedGeneratedExercise[];
  createdAt: string;
};

export type FirestoreWeeklyPlan = {
  schedule: WeeklyPlanSchedule;
  lastGeneratedAt?: string;
};

export type ValidatedPlan = {
  schedule: WeeklyPlanSchedule;
  workouts: GeneratedWorkoutDoc[];
};

const LOCAL_WEEK_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const TRAINING_DAY_INDICES: Record<string, number[]> = {
  '1-2x': [2, 5],
  '3-4x': [1, 2, 4, 5],
  '5-7x': [1, 2, 3, 4, 5, 6],
};

const RATE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;

/** Pre-composed full-body fallback when AI output fails validation. */
const FALLBACK_EXERCISE_REFS: ComposedExerciseRef[] = [
  { id: 'pelvic-curl', sets: 1, reps: 8 },
  { id: 'the-hundred', sets: 1, reps: 100 },
  { id: 'footwork-toes', sets: 3, reps: 10 },
  { id: 'bridge', sets: 2, reps: 10 },
  { id: 'spine-stretch-forward', sets: 1, reps: 6 },
  { id: 'childs-pose-rest', sets: 1, reps: 40 },
];

function clampSets(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const n = Math.round(value);
  if (n < 1 || n > 6) {
    return null;
  }
  return n;
}

function clampReps(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const n = Math.round(value);
  if (n < 1 || n > 200) {
    return null;
  }
  return n;
}

function titleCaseWords(input: string): string {
  return input
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      // Keep short connectors lowercase in the middle of titles when entire word
      if (word === '&') {
        return '&';
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function normalizeFocus(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function normalizeIntensity(value: unknown): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'high' || value === 'medium') {
    return value;
  }
  return 'medium';
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function resolveComposedExercises(
  refs: ComposedExerciseRef[]
): ResolvedGeneratedExercise[] {
  const resolved: ResolvedGeneratedExercise[] = [];

  for (const ref of refs) {
    const lib = getExerciseById(ref.id);
    if (!lib) {
      continue;
    }
    const sets = clampSets(ref.sets) ?? lib.defaultSets;
    const reps = clampReps(ref.reps) ?? lib.defaultReps;
    resolved.push({
      id: lib.id,
      name: lib.name,
      sets,
      reps,
      repType: lib.repType,
      springSetting: lib.springSetting,
      cue: lib.cue,
      tracked: lib.tracked,
      estimatedSeconds: lib.estimatedSeconds,
      equipment: lib.equipment,
      targetAreas: lib.targetAreas,
      difficulty: lib.difficulty,
    });
  }

  return resolved;
}

export function estimateDurationMinutes(
  exercises: ResolvedGeneratedExercise[]
): number {
  const totalSeconds = exercises.reduce(
    (sum, ex) => sum + ex.sets * ex.estimatedSeconds,
    0
  );
  return Math.max(1, Math.round(totalSeconds / 60));
}

function buildResolvedWorkout(input: {
  slug: string;
  title: string;
  focus: string;
  intensity: 'low' | 'medium' | 'high';
  exerciseRefs: ComposedExerciseRef[];
}): GeneratedWorkoutDoc | null {
  const exercises = resolveComposedExercises(input.exerciseRefs);
  if (exercises.length < 3) {
    return null;
  }

  return {
    slug: input.slug,
    title: input.title,
    focus: input.focus,
    intensity: input.intensity,
    voiceMode: 'generated',
    correctionMode: 'interval',
    estimatedDuration: estimateDurationMinutes(exercises),
    exercises,
    createdAt: new Date().toISOString(),
  };
}

export function buildFallbackPlan(frequency?: string): ValidatedPlan {
  const indices =
    TRAINING_DAY_INDICES[frequency ?? '3-4x'] ?? TRAINING_DAY_INDICES['3-4x'];
  const training = new Set(indices);

  const workout = buildResolvedWorkout({
    slug: 'full-body-foundations',
    title: 'Full Body Foundations',
    focus: 'full-body',
    intensity: 'medium',
    exerciseRefs: FALLBACK_EXERCISE_REFS,
  });

  if (!workout) {
    // Library must always resolve FALLBACK_EXERCISE_REFS — hard fail safe.
    throw new Error('[generatePlan] fallback workout failed to resolve');
  }

  const schedule = {} as WeeklyPlanSchedule;
  for (let index = 0; index < LOCAL_WEEK_DAY_KEYS.length; index += 1) {
    const dayKey = LOCAL_WEEK_DAY_KEYS[index] as WeekPlanDayKey;
    if (training.has(index)) {
      schedule[dayKey] = {
        type: 'workout',
        workoutSlug: workout.slug,
        title: workout.title,
        focus: workout.focus,
        estimatedDuration: workout.estimatedDuration,
      };
    } else {
      schedule[dayKey] = { type: 'rest' };
    }
  }

  // Ensure monday–sunday keys exist (LOCAL order includes all)
  for (const key of WEEK_PLAN_DAY_KEYS) {
    if (!schedule[key]) {
      schedule[key] = { type: 'rest' };
    }
  }

  return { schedule, workouts: [workout] };
}

/**
 * Validate / repair model output. Returns null if unrecoverable → caller uses fallback.
 */
export function validateAndRepairPlan(raw: unknown): ValidatedPlan | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const rawSchedule = record.schedule;
  const rawWorkouts = record.workouts;

  if (!rawSchedule || typeof rawSchedule !== 'object') {
    return null;
  }
  if (!Array.isArray(rawWorkouts) || rawWorkouts.length === 0) {
    return null;
  }

  const workouts: GeneratedWorkoutDoc[] = [];
  const workoutBySlug = new Map<string, GeneratedWorkoutDoc>();

  for (const item of rawWorkouts) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const w = item as Record<string, unknown>;
    const slug =
      typeof w.slug === 'string' && w.slug.trim()
        ? slugify(w.slug)
        : typeof w.title === 'string'
          ? slugify(w.title)
          : '';
    if (!slug) {
      continue;
    }

    const title =
      typeof w.title === 'string' && w.title.trim()
        ? titleCaseWords(w.title)
        : 'Custom Class';
    const focus =
      typeof w.focus === 'string' && w.focus.trim()
        ? normalizeFocus(w.focus) || 'full-body'
        : 'full-body';
    const intensity = normalizeIntensity(w.intensity);

    const exerciseRefs: ComposedExerciseRef[] = [];
    if (Array.isArray(w.exercises)) {
      for (const ex of w.exercises) {
        if (!ex || typeof ex !== 'object') {
          continue;
        }
        const e = ex as Record<string, unknown>;
        if (typeof e.id !== 'string' || !getExerciseById(e.id)) {
          continue;
        }
        const sets = clampSets(e.sets);
        const reps = clampReps(e.reps);
        if (sets == null || reps == null) {
          continue;
        }
        exerciseRefs.push({ id: e.id, sets, reps });
      }
    }

    const resolved = buildResolvedWorkout({
      slug,
      title,
      focus,
      intensity,
      exerciseRefs,
    });
    if (!resolved) {
      continue;
    }

    workouts.push(resolved);
    workoutBySlug.set(slug, resolved);
  }

  if (workouts.length === 0) {
    return null;
  }

  const schedule = {} as WeeklyPlanSchedule;
  const scheduleRecord = rawSchedule as Record<string, unknown>;

  for (const day of WEEK_PLAN_DAY_KEYS) {
    const entry = scheduleRecord[day];
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const dayEntry = entry as Record<string, unknown>;

    if (dayEntry.type === 'rest') {
      schedule[day] = { type: 'rest' };
      continue;
    }

    if (dayEntry.type === 'workout') {
      const slugRaw =
        typeof dayEntry.workoutSlug === 'string'
          ? slugify(dayEntry.workoutSlug)
          : '';
      const workout = workoutBySlug.get(slugRaw);
      if (!workout) {
        return null;
      }
      schedule[day] = {
        type: 'workout',
        workoutSlug: workout.slug,
        title: workout.title,
        focus: workout.focus,
        estimatedDuration: workout.estimatedDuration,
      };
      continue;
    }

    return null;
  }

  // Keep only workouts referenced in the schedule
  const usedSlugs = new Set(
    WEEK_PLAN_DAY_KEYS.map((d) => {
      const e = schedule[d];
      return e.type === 'workout' ? e.workoutSlug : null;
    }).filter((s): s is string => Boolean(s))
  );

  const usedWorkouts = workouts.filter((w) => usedSlugs.has(w.slug));
  if (usedWorkouts.length === 0) {
    return null;
  }

  return { schedule, workouts: usedWorkouts };
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

export async function fetchGeneratedWorkout(
  uid: string,
  slug: string
): Promise<GeneratedWorkoutDoc | null> {
  const snap = await getDoc(
    doc(db, 'users', uid, 'generatedWorkouts', slug)
  );
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as GeneratedWorkoutDoc;
}

/** Map firestore schedule → local calendar schedule rows. */
export function weekPlanToSchedule(
  schedule: WeeklyPlanSchedule,
  reference = new Date()
): WeeklySchedule {
  const weekDateKeys = getWeekDateKeys(reference);
  const days: ScheduledDay[] = weekDateKeys.map((dateKey, index) => {
    const dayKey = LOCAL_WEEK_DAY_KEYS[index] as WeekPlanDayKey;
    const entry = schedule[dayKey] ?? { type: 'rest' as const };

    if (entry.type === 'rest') {
      return {
        dateKey,
        libraryId: null,
        workoutId: null,
        generatedSlug: null,
        workoutTitle: null,
        workoutFocus: null,
        estimatedDuration: null,
        isRestDay: true,
      };
    }

    return {
      dateKey,
      libraryId: null,
      workoutId: entry.workoutSlug,
      generatedSlug: entry.workoutSlug,
      workoutTitle: entry.title ?? null,
      workoutFocus: entry.focus ?? null,
      estimatedDuration: entry.estimatedDuration ?? null,
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
  schedule: WeeklyPlanSchedule,
  reference = new Date()
): Promise<WeeklySchedule> {
  const local = weekPlanToSchedule(schedule, reference);
  await saveWeeklySchedule(local);
  return local;
}

async function writePlanAndWorkouts(
  uid: string,
  plan: ValidatedPlan
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const workout of plan.workouts) {
    const ref = doc(db, 'users', uid, 'generatedWorkouts', workout.slug);
    batch.set(ref, { ...workout, createdAt: workout.createdAt || now });
  }

  batch.set(doc(db, 'users', uid, 'plans', 'weekly'), {
    schedule: plan.schedule,
    lastGeneratedAt: now,
  });

  await batch.commit();
  await applyWeekPlanToLocalSchedule(plan.schedule);
}

export type GeneratePlanResult =
  | { ok: true; plan: ValidatedPlan; source: 'ai' | 'fallback' }
  | { ok: false; reason: 'rate_limited' | 'unauthenticated' | 'no_profile' };

/**
 * POST /api/generate-plan, validate/repair, silent fallback, write Firestore + local.
 * Network/validation issues → write deterministic plan (never surface model errors).
 */
export async function generateAndSaveWeeklyPlan(
  uid: string,
  profile: UserProfile,
  options?: { skipRateLimit?: boolean }
): Promise<GeneratePlanResult> {
  if (!options?.skipRateLimit) {
    const existing = await fetchFirestoreWeeklyPlan(uid);
    if (isPlanGenerationRateLimited(existing?.lastGeneratedAt)) {
      return { ok: false, reason: 'rate_limited' };
    }
  }

  let plan: ValidatedPlan | null = null;
  let source: 'ai' | 'fallback' = 'fallback';

  try {
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals: profile.goals ?? [],
        trainingFrequency: profile.trainingFrequency ?? '3-4x',
        frequency: profile.trainingFrequency ?? '3-4x',
        experienceLevel: profile.experienceLevel ?? 'Beginner',
        mindfulAreas: profile.mindfulAreas ?? [],
        equipment: profile.equipment ?? 'Reformer',
        exerciseCatalog: getExerciseCatalog(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const validated = validateAndRepairPlan(data);
      if (validated) {
        plan = validated;
        source = 'ai';
      }
    }
  } catch (error) {
    console.warn('[generatePlan] network failure — using fallback:', error);
  }

  if (!plan) {
    plan = buildFallbackPlan(profile.trainingFrequency);
    source = 'fallback';
  }

  await writePlanAndWorkouts(uid, plan);
  return { ok: true, plan, source };
}
