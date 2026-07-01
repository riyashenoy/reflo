import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

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

type WorkoutHistoryState = {
  entries: WorkoutHistoryEntry[];
  isLoading: boolean;
  streak: number;
  weekStreakDays: HomeStreakDay[];
  weeklyPlan: WeeklyPlanDay[];
  refresh: () => Promise<void>;
};

export function useWorkoutHistory(): WorkoutHistoryState {
  const [entries, setEntries] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const history = await readWorkoutHistory();
    setEntries(history);
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

  const weeklyPlan = useMemo(() => buildWeeklyPlan(entries), [entries]);

  return {
    entries,
    isLoading,
    streak,
    weekStreakDays,
    weeklyPlan,
    refresh,
  };
}
