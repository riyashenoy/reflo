import AsyncStorage from '@react-native-async-storage/async-storage';

import { getWorkoutById } from '../data/workouts';
import type { SessionLogEntry } from '../hooks/usePoseDetection';

const STORAGE_KEY = 'reflo.workoutHistory';

export type WorkoutHistoryEntry = {
  date: string;
  workoutId: string;
  formScore: number;
  completedAt: string;
};

export type WeekDayStatus = 'completed' | 'today' | 'future' | 'missed';

export type HomeStreakDay = {
  label: string;
  dateKey: string;
  isToday: boolean;
  isCompleted: boolean;
};

export type WeeklyPlanDay = {
  dayIndex: number;
  dayName: string;
  dateKey: string;
  status: WeekDayStatus;
  workoutId: string;
  workoutTitle: string;
  duration: number;
  formScore?: number;
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'] as const;

const DAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const DEFAULT_WORKOUT_ID = 'full-body-burn';

const STREAK_HEADINGS: { min: number; text: string }[] = [
  { min: 30, text: 'A month of movement.' },
  { min: 21, text: 'This is becoming a ritual.' },
  { min: 10, text: 'Ten days of control.' },
  { min: 7, text: 'One week in flow.' },
  { min: 3, text: 'You\u2019re finding a rhythm.' },
  { min: 1, text: 'You showed up.' },
];

export function getStreakHeading(streak: number): string {
  if (streak <= 0) {
    return 'Keep it Going';
  }

  const milestone = STREAK_HEADINGS.find((entry) => streak >= entry.min);
  return milestone?.text ?? 'Keep it Going';
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getStartOfWeek(date = new Date()): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function getWeekDateKeys(reference = new Date()): string[] {
  const weekStart = getStartOfWeek(reference);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return toDateKey(day);
  });
}

export function estimateFormScore(sessionLog?: SessionLogEntry[]): number {
  if (!sessionLog?.length) {
    return 82;
  }

  const corrections = sessionLog.filter((entry) => entry.type === 'correction').length;
  const positives = sessionLog.filter((entry) => entry.type === 'positive').length;
  const score = Math.round(85 + positives * 3 - corrections * 5);

  return Math.min(99, Math.max(60, score));
}

export async function readWorkoutHistory(): Promise<WorkoutHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is WorkoutHistoryEntry =>
        typeof entry?.date === 'string' &&
        typeof entry?.workoutId === 'string' &&
        typeof entry?.formScore === 'number' &&
        typeof entry?.completedAt === 'string'
    );
  } catch (error) {
    console.warn('[workoutHistory] read failed:', error);
    return [];
  }
}

export async function recordWorkoutCompletion(
  workoutId: string,
  sessionLog?: SessionLogEntry[]
): Promise<WorkoutHistoryEntry> {
  const entry: WorkoutHistoryEntry = {
    date: toDateKey(new Date()),
    workoutId,
    formScore: estimateFormScore(sessionLog),
    completedAt: new Date().toISOString(),
  };

  const history = await readWorkoutHistory();
  const withoutToday = history.filter((item) => item.date !== entry.date);
  const nextHistory = [...withoutToday, entry].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));

  return entry;
}

export function getCompletedDateKeys(
  entries: WorkoutHistoryEntry[]
): Set<string> {
  return new Set(entries.map((entry) => entry.date));
}

export function getCompletionByDate(
  entries: WorkoutHistoryEntry[]
): Map<string, WorkoutHistoryEntry> {
  const map = new Map<string, WorkoutHistoryEntry>();

  for (const entry of entries) {
    const existing = map.get(entry.date);
    if (!existing || entry.completedAt > existing.completedAt) {
      map.set(entry.date, entry);
    }
  }

  return map;
}

export function computeCurrentStreak(
  completedDateKeys: Set<string>,
  reference = new Date()
): number {
  const todayKey = toDateKey(reference);
  const yesterdayKey = toDateKey(addDays(reference, -1));

  let cursor: Date | null = null;

  if (completedDateKeys.has(todayKey)) {
    cursor = startOfDay(reference);
  } else if (completedDateKeys.has(yesterdayKey)) {
    cursor = startOfDay(addDays(reference, -1));
  } else {
    return 0;
  }

  let streak = 0;

  while (cursor && completedDateKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function getHomeStreakDays(
  completedDateKeys: Set<string>,
  reference = new Date()
): HomeStreakDay[] {
  const weekDateKeys = getWeekDateKeys(reference);
  const todayKey = toDateKey(reference);

  return DAY_LABELS.map((label, index) => ({
    label,
    dateKey: weekDateKeys[index],
    isToday: weekDateKeys[index] === todayKey,
    isCompleted: completedDateKeys.has(weekDateKeys[index]),
  }));
}

export function buildWeeklyPlan(
  entries: WorkoutHistoryEntry[],
  reference = new Date()
): WeeklyPlanDay[] {
  const completionByDate = getCompletionByDate(entries);
  const todayIndex = reference.getDay();
  const weekDateKeys = getWeekDateKeys(reference);
  const fallbackWorkout = getWorkoutById(DEFAULT_WORKOUT_ID);

  return DAY_NAMES.map((dayName, dayIndex) => {
    const dateKey = weekDateKeys[dayIndex];
    const completion = completionByDate.get(dateKey);

    let status: WeekDayStatus;
    if (completion) {
      status = 'completed';
    } else if (dayIndex === todayIndex) {
      status = 'today';
    } else if (dayIndex > todayIndex) {
      status = 'future';
    } else {
      status = 'missed';
    }

    const workout = completion
      ? getWorkoutById(completion.workoutId)
      : fallbackWorkout;

    return {
      dayIndex,
      dayName,
      dateKey,
      status,
      workoutId: completion?.workoutId ?? fallbackWorkout?.id ?? DEFAULT_WORKOUT_ID,
      workoutTitle: workout?.title ?? 'Workout',
      duration: workout?.duration ?? 5,
      formScore: completion?.formScore,
    };
  });
}
