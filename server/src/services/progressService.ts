import { query } from '../config/db.js';

/** Matches Progress.tsx CLIP_LABELS for top-correction display. */
const CLIP_LABELS: Record<string, string> = {
  '01': 'Stay focused',
  '02': 'Steady breathing',
  '03': 'Great form',
  '04': 'Strong control',
  '05': 'Hip pike',
  '06': 'Hip sag',
  '07': 'Head drop',
  '08': 'Arms sinking',
  '09': 'Knee cave',
  '10': 'Heels drop',
  '11': 'Rushing',
  '12': 'Hip break',
  '13': 'Momentum',
  generated: 'Form correction',
};

export type ProgressPeriod = 'week' | 'month' | 'all';

function periodStart(period: ProgressPeriod, reference = new Date()): string | null {
  if (period === 'all') {
    return null;
  }
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const daysBack = period === 'week' ? 6 : 29;
  start.setDate(start.getDate() - daysBack);
  return start.toISOString().slice(0, 10);
}

function formatTotalTime(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

function weekdayLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'][date.getDay()] ?? '';
}

export async function getProgressSummary(
  userId: string,
  period: ProgressPeriod
) {
  const from = periodStart(period);
  const params: unknown[] = [userId];
  let dateFilter = '';
  if (from) {
    params.push(from);
    dateFilter = `AND s.date_key >= $2::date`;
  }

  const sessionsResult = await query<{
    date_key: string;
    duration_seconds: number;
    correction_count: number;
    overall_stars: number | null;
  }>(
    `
    SELECT date_key::text, duration_seconds, correction_count, overall_stars
    FROM sessions s
    WHERE s.user_id = $1
    ${dateFilter}
    ORDER BY s.date_key ASC
    `,
    params
  );

  const sessions = sessionsResult.rows;
  if (!sessions.length) {
    return {
      hasData: false,
      sessions: 0,
      totalTime: '0m',
      averageStars: '0.0',
      mostCommon: '—',
      chartPoints: [] as Array<{ dateKey: string; label: string; score: number }>,
    };
  }

  const totalSeconds = sessions.reduce(
    (sum, row) => sum + (row.duration_seconds || 0),
    0
  );
  const starred = sessions.filter((row) => typeof row.overall_stars === 'number');
  const averageStars =
    starred.length > 0
      ? (
          starred.reduce((sum, row) => sum + (row.overall_stars || 0), 0) /
          starred.length
        ).toFixed(1)
      : '0.0';

  const topParams: unknown[] = [userId];
  let topDateFilter = '';
  if (from) {
    topParams.push(from);
    topDateFilter = `AND s.date_key >= $2::date`;
  }

  const topResult = await query<{ clip_played: string | null; count: string }>(
    `
    SELECT e.clip_played, COUNT(*)::text AS count
    FROM session_events e
    INNER JOIN sessions s ON s.id = e.session_id
    WHERE e.user_id = $1
      AND e.event_type = 'correction'
      ${topDateFilter}
    GROUP BY e.clip_played
    ORDER BY COUNT(*) DESC
    LIMIT 1
    `,
    topParams
  );

  const topClip = topResult.rows[0]?.clip_played;
  const mostCommon =
    (topClip && CLIP_LABELS[topClip]) ||
    (topClip ? topClip : '—');

  return {
    hasData: true,
    sessions: sessions.length,
    totalTime: formatTotalTime(totalSeconds),
    averageStars,
    mostCommon,
    // Mirrors current Progress.tsx chart: Y = correction_count per session day.
    chartPoints: sessions.map((row) => ({
      dateKey: row.date_key,
      label: weekdayLabel(row.date_key),
      score: row.correction_count,
    })),
  };
}
