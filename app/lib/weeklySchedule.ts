import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  libraryWorkouts,
  type LibraryWorkout,
} from '../data/workoutLibrary';
import type { UserProfile } from './userProfile';
import {
  getWeekDateKeys,
  toDateKey,
  type WorkoutHistoryEntry,
} from './workoutHistory';

const STORAGE_KEY = 'reflo.weeklySchedule';

export type ScheduledDay = {
  dateKey: string;
  libraryId: string | null;
  workoutId: string | null;
  isRestDay: boolean;
};

export type WeeklySchedule = {
  weekStartKey: string;
  generatedAt: string;
  days: ScheduledDay[];
};

type LibraryCategory = LibraryWorkout['category'];

const TRAINING_DAY_INDICES: Record<string, number[]> = {
  '1-2x': [2, 5],
  '3-4x': [1, 2, 4, 5],
  '5-7x': [1, 2, 3, 4, 5, 6],
};

const TARGET_AREA_CATEGORY: Record<string, LibraryCategory> = {
  Core: 'Core',
  Glutes: 'Lower Body',
  Arms: 'Upper Body',
  Back: 'Upper Body',
  'Inner Thighs': 'Lower Body',
  'Full Body': 'Full Body',
};

const GOAL_CATEGORY_BOOST: Record<string, LibraryCategory[]> = {
  strength: ['Upper Body', 'Full Body'],
  flexibility: ['Full Body', 'Core'],
  weight: ['Full Body', 'Core'],
  posture: ['Core', 'Full Body'],
  stress: ['Full Body'],
  performance: ['Full Body', 'Lower Body'],
};

const MINDFUL_CATEGORY_AVOID: Record<string, LibraryCategory[]> = {
  'Knee sensitivity': ['Lower Body'],
  'Shoulder injury': ['Upper Body'],
  'Neck Tension': ['Upper Body'],
};

export async function readWeeklySchedule(): Promise<WeeklySchedule | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as WeeklySchedule;
    if (!parsed?.weekStartKey || !Array.isArray(parsed.days)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[weeklySchedule] read failed:', error);
    return null;
  }
}

export async function saveWeeklySchedule(
  schedule: WeeklySchedule
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function getTrainingDayIndices(frequency?: string): number[] {
  return TRAINING_DAY_INDICES[frequency ?? '3-4x'] ?? TRAINING_DAY_INDICES['3-4x'];
}

function buildCategoryPriority(profile: UserProfile): LibraryCategory[] {
  const scores = new Map<LibraryCategory, number>();

  const bump = (category: LibraryCategory, amount: number) => {
    scores.set(category, (scores.get(category) ?? 0) + amount);
  };

  for (const area of profile.targetAreas ?? []) {
    const category = TARGET_AREA_CATEGORY[area];
    if (category) {
      bump(category, 3);
    }
  }

  for (const goal of profile.goals ?? []) {
    for (const category of GOAL_CATEGORY_BOOST[goal] ?? []) {
      bump(category, 2);
    }
  }

  if (!scores.size) {
    bump('Full Body', 1);
  }

  const mindful = profile.mindfulAreas ?? [];
  for (const area of mindful) {
    for (const avoid of MINDFUL_CATEGORY_AVOID[area] ?? []) {
      scores.set(avoid, (scores.get(avoid) ?? 0) - 4);
    }
    if (area === 'Lower back' || area === 'Tight Hips') {
      bump('Core', 2);
      bump('Full Body', 1);
    }
  }

  if (profile.experienceLevel === 'Beginner') {
    bump('Full Body', 2);
    bump('Core', 1);
  }

  const ordered = [...scores.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  if (!ordered.length) {
    return ['Full Body', 'Core', 'Upper Body', 'Lower Body'];
  }

  for (const category of ['Full Body', 'Core', 'Upper Body', 'Lower Body'] as const) {
    if (!ordered.includes(category)) {
      ordered.push(category);
    }
  }

  return ordered;
}

function pickLibraryWorkout(
  category: LibraryCategory,
  rotationIndex: number,
  avoidCategories: Set<LibraryCategory>
): LibraryWorkout {
  const pool = libraryWorkouts.filter(
    (item) =>
      item.category === category && !avoidCategories.has(item.category)
  );

  if (pool.length) {
    return pool[rotationIndex % pool.length];
  }

  const fallbackPool = libraryWorkouts.filter(
    (item) => !avoidCategories.has(item.category)
  );

  return (
    fallbackPool[rotationIndex % fallbackPool.length] ??
    libraryWorkouts[rotationIndex % libraryWorkouts.length]
  );
}

export function generateScheduleDays(
  profile: UserProfile,
  weekDateKeys: string[],
  reference = new Date()
): ScheduledDay[] {
  const trainingIndices = new Set(getTrainingDayIndices(profile.trainingFrequency));
  const categoryPriority = buildCategoryPriority(profile);
  const avoidCategories = new Set<LibraryCategory>();

  for (const area of profile.mindfulAreas ?? []) {
    for (const category of MINDFUL_CATEGORY_AVOID[area] ?? []) {
      avoidCategories.add(category);
    }
  }

  let workoutRotation = 0;

  return weekDateKeys.map((dateKey, dayIndex) => {
    const isTrainingDay = trainingIndices.has(dayIndex);

    if (!isTrainingDay) {
      return {
        dateKey,
        libraryId: null,
        workoutId: null,
        isRestDay: true,
      };
    }

    const category =
      categoryPriority[workoutRotation % categoryPriority.length] ?? 'Full Body';
    const libraryItem = pickLibraryWorkout(
      category,
      workoutRotation,
      avoidCategories
    );
    workoutRotation += 1;

    return {
      dateKey,
      libraryId: libraryItem.id,
      workoutId: libraryItem.workoutId,
      isRestDay: false,
    };
  });
}

export function getCompletedDateKeysFromEntries(
  entries: WorkoutHistoryEntry[]
): Set<string> {
  return new Set(entries.map((entry) => entry.date));
}

export async function regenerateWeeklySchedule(
  profile: UserProfile,
  completedDateKeys: Set<string>,
  reference = new Date()
): Promise<WeeklySchedule> {
  const weekDateKeys = getWeekDateKeys(reference);
  const freshDays = generateScheduleDays(profile, weekDateKeys, reference);
  const existing = await readWeeklySchedule();
  const existingByDate = new Map(
    (existing?.days ?? []).map((day) => [day.dateKey, day])
  );

  const days = weekDateKeys.map((dateKey, index) => {
    if (completedDateKeys.has(dateKey)) {
      return (
        existingByDate.get(dateKey) ?? {
          ...freshDays[index],
        }
      );
    }

    return freshDays[index];
  });

  const schedule: WeeklySchedule = {
    weekStartKey: weekDateKeys[0],
    generatedAt: new Date().toISOString(),
    days,
  };

  await saveWeeklySchedule(schedule);
  return schedule;
}

export async function ensureCurrentWeekSchedule(
  profile: UserProfile | null,
  completedDateKeys: Set<string>,
  reference = new Date()
): Promise<WeeklySchedule | null> {
  if (!profile) {
    return readWeeklySchedule();
  }

  const weekDateKeys = getWeekDateKeys(reference);
  const weekStartKey = weekDateKeys[0];
  const existing = await readWeeklySchedule();

  if (!existing || existing.weekStartKey !== weekStartKey) {
    return regenerateWeeklySchedule(profile, completedDateKeys, reference);
  }

  return existing;
}

export function getScheduledDayMap(
  schedule: WeeklySchedule | null
): Map<string, ScheduledDay> {
  return new Map((schedule?.days ?? []).map((day) => [day.dateKey, day]));
}
