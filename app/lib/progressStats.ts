import type { WorkoutHistoryEntry } from './workoutHistory';
import { toDateKey } from './workoutHistory';

export type ProgressPeriod = 'Week' | 'Month' | 'All time';

export type FormScorePoint = {
  dateKey: string;
  label: string;
  score: number;
};

export type ProgressSummary = {
  sessions: number;
  streak: number;
  bestScore: number;
  averageScore: number;
  chartPoints: FormScorePoint[];
  hasData: boolean;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPeriodStart(period: ProgressPeriod, reference = new Date()): Date | null {
  if (period === 'All time') {
    return null;
  }

  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);

  if (period === 'Week') {
    return addDays(start, -6);
  }

  return addDays(start, -29);
}

function formatChartLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  return labels[date.getDay()];
}

export function filterEntriesByPeriod(
  entries: WorkoutHistoryEntry[],
  period: ProgressPeriod,
  reference = new Date()
): WorkoutHistoryEntry[] {
  const start = getPeriodStart(period, reference);
  if (!start) {
    return [...entries].sort((a, b) => a.date.localeCompare(b.date));
  }

  const startKey = toDateKey(start);
  return entries
    .filter((entry) => entry.date >= startKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildProgressSummary(
  entries: WorkoutHistoryEntry[],
  period: ProgressPeriod,
  streak: number,
  reference = new Date()
): ProgressSummary {
  const filtered = filterEntriesByPeriod(entries, period, reference);

  if (!filtered.length) {
    return {
      sessions: 0,
      streak,
      bestScore: 0,
      averageScore: 0,
      chartPoints: [],
      hasData: false,
    };
  }

  const scores = filtered.map((entry) => entry.formScore);
  const bestScore = Math.max(...scores);
  const averageScore = Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  );

  const chartPoints = filtered.map((entry) => ({
    dateKey: entry.date,
    label: formatChartLabel(entry.date),
    score: entry.formScore,
  }));

  return {
    sessions: filtered.length,
    streak,
    bestScore,
    averageScore,
    chartPoints,
    hasData: true,
  };
}
