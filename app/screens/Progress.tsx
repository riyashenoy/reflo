import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { FormScoreChart, ProgressEmptyState } from '../components/FormScoreChart';
import { FadeInView } from '../components/motion';
import { useLayoutWidth } from '../hooks/useLayoutWidth';
import { useSessions, type Session } from '../hooks/useSessions';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import { toDateKey } from '../lib/workoutHistory';
import theme, { scale } from '../theme';

type ProgressPeriod = 'Week' | 'Month' | 'All time';

const PERIODS: ProgressPeriod[] = ['Week', 'Month', 'All time'];
const WARM_RULE = '#E4E2DD';

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
  return period === 'Week' ? addDays(start, -6) : addDays(start, -29);
}

function filterSessionsByPeriod(
  sessions: Session[],
  period: ProgressPeriod,
  reference = new Date()
): Session[] {
  const start = getPeriodStart(period, reference);
  if (!start) {
    return [...sessions].sort((a, b) => a.id.localeCompare(b.id));
  }

  const startKey = toDateKey(start);
  return sessions
    .filter((session) => session.id >= startKey)
    .sort((a, b) => a.id.localeCompare(b.id));
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

function formatChartLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'][date.getDay()];
}

function getMostCommonCorrection(sessions: Session[]): string {
  const counts = new Map<string, number>();

  sessions.forEach((session) => {
    session.sessionLog.forEach((entry) => {
      if (entry.type !== 'correction') {
        return;
      }
      counts.set(entry.clipPlayed, (counts.get(entry.clipPlayed) ?? 0) + 1);
    });
  });

  let topClip: string | null = null;
  let topCount = 0;
  counts.forEach((count, clip) => {
    if (count > topCount) {
      topClip = clip;
      topCount = count;
    }
  });

  if (!topClip) {
    return '—';
  }

  const label = CLIP_LABELS[topClip] ?? `Clip ${topClip}`;
  return `${label} · ${topCount}`;
}

function PeriodTab({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.periodTab}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={isActive ? styles.periodTabActive : undefined}>
        <Text
          style={[
            styles.periodTabText,
            isActive ? styles.periodTabTextActive : styles.periodTabTextInactive,
          ]}
        >
          {label.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

function StatBlock({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionEyebrow({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

export default function Progress() {
  const tabTopPadding = useTabScreenTopPadding();
  const layoutWidth = useLayoutWidth();
  const { sessions, loading, refetch } = useSessions();
  const [activePeriod, setActivePeriod] = useState<ProgressPeriod>('Week');

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const chartWidth = layoutWidth - scale(40);

  const summary = useMemo(() => {
    const filtered = filterSessionsByPeriod(sessions, activePeriod);
    if (!filtered.length) {
      return {
        hasData: false,
        sessions: 0,
        totalTime: '0m',
        averageStars: '—',
        mostCommon: '—',
        chartPoints: [] as Array<{ dateKey: string; label: string; score: number }>,
      };
    }

    const totalSeconds = filtered.reduce(
      (sum, session) => sum + (session.durationSeconds || 0),
      0
    );
    const starTotal = filtered.reduce(
      (sum, session) => sum + (session.overallStars || 0),
      0
    );
    const averageStars = (starTotal / filtered.length).toFixed(1);

    return {
      hasData: true,
      sessions: filtered.length,
      totalTime: formatTotalTime(totalSeconds),
      averageStars,
      mostCommon: getMostCommonCorrection(filtered),
      chartPoints: filtered.map((session) => ({
        dateKey: session.id,
        label: formatChartLabel(session.id),
        score: session.correctionCount,
      })),
    };
  }, [activePeriod, sessions]);

  const chartMax = Math.max(
    5,
    ...summary.chartPoints.map((point) => point.score)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: tabTopPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>YOUR STATS</Text>
          <Text style={styles.heading}>Progress.</Text>
        </View>

        <View style={styles.periodToggle}>
          {PERIODS.map((period) => (
            <PeriodTab
              key={period}
              label={period}
              isActive={activePeriod === period}
              onPress={() => setActivePeriod(period)}
            />
          ))}
        </View>
      </View>

      <FadeInView style={styles.content} delay={80}>
        <SectionEyebrow title="CORRECTIONS OVER TIME" />
        {loading ? (
          <Text style={styles.emptyMessage}>Loading workouts…</Text>
        ) : summary.hasData ? (
          <FormScoreChart
            points={summary.chartPoints}
            width={chartWidth}
            minValue={0}
            maxValue={chartMax}
          />
        ) : (
          <ProgressEmptyState />
        )}

        {summary.hasData ? (
          <>
            <View style={styles.statsRule} />
            <View style={styles.statRow}>
              <StatBlock value={summary.sessions} label="SESSIONS DONE" />
              <StatBlock value={summary.totalTime} label="TOTAL TIME" />
            </View>

            <View style={styles.statsRule} />
            <View style={styles.statRow}>
              <StatBlock value={summary.averageStars} label="AVERAGE STARS" />
              <StatBlock value={summary.mostCommon} label="TOP CORRECTION" />
            </View>
          </>
        ) : !loading ? (
          <>
            <View style={styles.statsRule} />
            <Text style={styles.motivationTitle}>Build your movement story</Text>
            <Text style={styles.motivationText}>
              Complete a class from your weekly plan or the workout library.
              Your sessions, streak, and form scores will appear here
              automatically.
            </Text>
          </>
        ) : null}
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(140),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(28),
    gap: scale(12),
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.6),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: scale(6),
  },
  heading: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingTop: scale(4),
  },
  periodTab: {
    paddingVertical: scale(4),
  },
  periodTabActive: {
    borderBottomWidth: scale(2),
    borderBottomColor: theme.colors.red,
    alignSelf: 'flex-start',
  },
  periodTabText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
  },
  periodTabTextActive: {
    color: theme.colors.textPrimary,
  },
  periodTabTextInactive: {
    color: theme.colors.textMuted,
  },
  content: {
    gap: 0,
  },
  sectionHeader: {
    marginBottom: scale(16),
  },
  sectionEyebrow: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: scale(10),
  },
  sectionRule: {
    borderBottomWidth: scale(0.5),
    borderBottomColor: WARM_RULE,
  },
  emptyMessage: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.textMuted,
    marginBottom: scale(8),
  },
  statsRule: {
    borderBottomWidth: scale(0.5),
    borderBottomColor: WARM_RULE,
    marginTop: scale(28),
    marginBottom: scale(20),
  },
  statRow: {
    flexDirection: 'row',
    gap: scale(24),
  },
  statBlock: {
    flex: 1,
  },
  statValue: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
    lineHeight: scale(34),
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginTop: scale(6),
  },
  motivationTitle: {
    fontFamily: theme.fonts.header,
    fontSize: scale(20),
    letterSpacing: scale(-0.5),
    color: theme.colors.textPrimary,
    marginBottom: scale(8),
  },
  motivationText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    lineHeight: scale(20),
    color: theme.colors.textMuted,
  },
});
