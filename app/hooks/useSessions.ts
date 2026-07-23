import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import { toDateKey } from '../lib/workoutHistory';
import { readWeeklySchedule } from '../lib/weeklySchedule';

export type Session = {
  id: string;
  workoutId: string;
  completedAt: string;
  durationSeconds: number;
  correctionCount: number;
  sessionLog: Array<{
    exercise: string;
    clipPlayed: string;
    timestamp: number;
    type: string;
  }>;
  ratings: Record<number, string>;
  overallStars: number;
};

type WeeklyPlanByDay = Record<string, string>;

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseSessionDoc(
  id: string,
  data: Record<string, unknown>
): Session {
  const sessionLog = Array.isArray(data.sessionLog)
    ? (data.sessionLog as Session['sessionLog'])
    : [];
  const ratings =
    data.ratings && typeof data.ratings === 'object'
      ? (data.ratings as Record<number, string>)
      : {};

  return {
    id,
    workoutId: typeof data.workoutId === 'string' ? data.workoutId : '',
    completedAt:
      typeof data.completedAt === 'string'
        ? data.completedAt
        : new Date().toISOString(),
    durationSeconds:
      typeof data.durationSeconds === 'number' ? data.durationSeconds : 0,
    correctionCount:
      typeof data.correctionCount === 'number'
        ? data.correctionCount
        : sessionLog.filter((entry) => entry.type === 'correction').length,
    sessionLog,
    ratings,
    overallStars:
      typeof data.overallStars === 'number' ? data.overallStars : 0,
  };
}

function computeStreak(
  sessionIds: Set<string>,
  weeklyPlan: WeeklyPlanByDay | null,
  restDateKeys: Set<string>,
  reference = new Date()
): number {
  const todayId = toDateKey(reference);
  let streak = 0;
  const cursor = new Date(reference);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i += 1) {
    const dateId = toDateKey(cursor);
    const dayName = DAY_NAMES[cursor.getDay()];
    const hasSession = sessionIds.has(dateId);
    const isRestDay =
      weeklyPlan?.[dayName] === 'rest' || restDateKeys.has(dateId);

    if (hasSession) {
      streak += 1;
    } else if (isRestDay) {
      // Rest day — streak survives
    } else if (dateId === todayId) {
      // Today not done yet — don't break, just skip
    } else {
      break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getHomeSessionStreakDays(
  sessions: Session[],
  reference = new Date()
) {
  const todayKey = toDateKey(reference);
  const sessionIds = new Set(sessions.map((session) => session.id));
  const labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'] as const;

  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(reference, index);
    const dateKey = toDateKey(day);
    return {
      label: labels[day.getDay()],
      dateKey,
      isToday: dateKey === todayKey,
      isCompleted: sessionIds.has(dateKey),
    };
  });
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanByDay | null>(null);
  const [restDateKeys, setRestDateKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setSessions([]);
      setWeeklyPlan(null);
      setRestDateKeys(new Set());
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const sessionsSnap = await getDocs(
        collection(db, 'users', uid, 'sessions')
      );
      const nextSessions = sessionsSnap.docs
        .map((sessionDoc) =>
          parseSessionDoc(
            sessionDoc.id,
            sessionDoc.data() as Record<string, unknown>
          )
        )
        .sort((a, b) => b.id.localeCompare(a.id));

      let nextPlan: WeeklyPlanByDay | null = null;
      try {
        const planSnap = await getDoc(doc(db, 'users', uid, 'plans', 'weekly'));
        if (planSnap.exists()) {
          nextPlan = planSnap.data() as WeeklyPlanByDay;
        }
      } catch (planError) {
        console.warn('[useSessions] weekly plan read failed:', planError);
      }

      const nextRestKeys = new Set<string>();
      try {
        const schedule = await readWeeklySchedule();
        schedule?.days.forEach((day) => {
          if (day.isRestDay) {
            nextRestKeys.add(day.dateKey);
          }
        });
      } catch (scheduleError) {
        console.warn('[useSessions] local schedule read failed:', scheduleError);
      }

      setSessions(nextSessions);
      setWeeklyPlan(nextPlan);
      setRestDateKeys(nextRestKeys);
      setError(null);
    } catch (readError) {
      console.warn('[useSessions] sessions read failed:', readError);
      setSessions([]);
      setError('Couldn’t load sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();

    const unsubscribe = auth.onAuthStateChanged(() => {
      setLoading(true);
      void refetch();
    });

    return unsubscribe;
  }, [refetch]);

  const streak = useMemo(() => {
    const sessionIds = new Set(sessions.map((session) => session.id));
    return computeStreak(sessionIds, weeklyPlan, restDateKeys);
  }, [sessions, weeklyPlan, restDateKeys]);

  return {
    sessions,
    loading,
    error,
    streak,
    refetch,
  };
}
