import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { auth } from '../lib/firebase';
import { fetchUserProfile } from '../lib/userProfile';
import {
  buildWeeklyPlan,
  computeCurrentStreak,
  getCompletedDateKeys,
  getHomeStreakDays,
  readWorkoutHistory,
  type HomeStreakDay,
  type WeeklyPlanDay,
  type WorkoutHistoryEntry,
} from '../lib/workoutHistory';
import {
  ensureCurrentWeekSchedule,
  readWeeklySchedule,
  regenerateWeeklySchedule,
  type WeeklySchedule,
} from '../lib/weeklySchedule';

type WorkoutHistoryState = {
  entries: WorkoutHistoryEntry[];
  isLoading: boolean;
  streak: number;
  weekStreakDays: HomeStreakDay[];
  weeklyPlan: WeeklyPlanDay[];
  schedule: WeeklySchedule | null;
  refresh: () => Promise<void>;
  regenerateSchedule: () => Promise<void>;
};

export function useWorkoutHistory(): WorkoutHistoryState {
  const [entries, setEntries] = useState<WorkoutHistoryEntry[]>([]);
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const history = await readWorkoutHistory();
    setEntries(history);

    const completedDateKeys = getCompletedDateKeys(history);
    const uid = auth.currentUser?.uid;
    let nextSchedule = await readWeeklySchedule();

    if (uid) {
      try {
        const profile = await fetchUserProfile(uid);
        nextSchedule = await ensureCurrentWeekSchedule(
          profile,
          completedDateKeys
        );
      } catch (error) {
        console.warn('[useWorkoutHistory] schedule load failed:', error);
      }
    }

    setSchedule(nextSchedule);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const completedDateKeys = useMemo(
    () => getCompletedDateKeys(entries),
    [entries]
  );

  const streak = useMemo(
    () => computeCurrentStreak(completedDateKeys),
    [completedDateKeys]
  );

  const weekStreakDays = useMemo(
    () => getHomeStreakDays(completedDateKeys),
    [completedDateKeys]
  );

  const weeklyPlan = useMemo(
    () => buildWeeklyPlan(entries, schedule),
    [entries, schedule]
  );

  const regenerateSchedule = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    const profile = await fetchUserProfile(uid);
    if (!profile) {
      return;
    }

    const history = await readWorkoutHistory();
    const nextSchedule = await regenerateWeeklySchedule(
      profile,
      getCompletedDateKeys(history)
    );
    setSchedule(nextSchedule);
    setEntries(history);
  }, []);

  return {
    entries,
    isLoading,
    streak,
    weekStreakDays,
    weeklyPlan,
    schedule,
    refresh,
    regenerateSchedule,
  };
}
