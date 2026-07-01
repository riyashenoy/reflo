import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FormScoreChart, ProgressEmptyState } from '../components/FormScoreChart';
import { FadeInView, SegmentPillLight } from '../components/motion';
import { useLayoutWidth } from '../hooks/useLayoutWidth';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import {
  buildProgressSummary,
  type ProgressPeriod,
} from '../lib/progressStats';
import theme, { scale } from '../theme';

const PERIODS: ProgressPeriod[] = ['Week', 'Month', 'All time'];

function StatCard({
  value,
  label,
  style,
  accent,
}: {
  value: number | string;
  label: string;
  style?: object;
  accent?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        styles.statCard,
        accent && styles.statCardAccent,
        style,
      ]}
    >
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>
        {label}
      </Text>
    </View>
  );
}

export default function Progress() {
  const tabTopPadding = useTabScreenTopPadding();
  const layoutWidth = useLayoutWidth();
  const { entries, streak, isLoading } = useWorkoutHistory();
  const [activePeriod, setActivePeriod] = useState<ProgressPeriod>('Week');

  const chartWidth = layoutWidth - scale(40) - scale(32);

  const summary = useMemo(
    () => buildProgressSummary(entries, activePeriod, streak),
    [activePeriod, entries, streak]
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
        <Text style={styles.heading}>Your Progress.</Text>

        <View style={styles.periodToggle}>
          {PERIODS.map((period) => (
            <SegmentPillLight
              key={period}
              label={period}
              isActive={activePeriod === period}
              onPress={() => setActivePeriod(period)}
            />
          ))}
        </View>
      </View>

      <FadeInView style={styles.cards} delay={80}>
        <View style={[styles.card, styles.chartCard]}>
          <Text style={styles.chartTitle}>Form Score Over Time</Text>
          {isLoading ? (
            <View style={styles.chartLoading}>
              <Text style={styles.chartLoadingText}>Loading workouts…</Text>
            </View>
          ) : summary.hasData ? (
            <FormScoreChart points={summary.chartPoints} width={chartWidth} />
          ) : (
            <ProgressEmptyState />
          )}
        </View>

        {summary.hasData ? (
          <>
            <View style={styles.statRow}>
              <StatCard
                value={summary.sessions}
                label="Sessions Done"
                style={styles.halfCard}
              />
              <StatCard
                value={summary.streak}
                label="Current Streak"
                style={styles.halfCard}
              />
            </View>

            <View style={styles.statRow}>
              <StatCard
                value={summary.averageScore}
                label="Average Form Score"
                style={styles.halfCard}
              />
              <StatCard
                value={summary.bestScore}
                label="Personal Best"
                style={styles.halfCard}
                accent
              />
            </View>
          </>
        ) : !isLoading ? (
          <View style={styles.card}>
            <Text style={styles.motivationTitle}>Build your movement story</Text>
            <Text style={styles.motivationText}>
              Complete a class from your weekly plan or the workout library.
              Your sessions, streak, and form scores will appear here
              automatically.
            </Text>
          </View>
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
    paddingBottom: scale(120),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(20),
    gap: scale(12),
  },
  heading: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.grey200,
    borderRadius: theme.radius.full,
    padding: scale(3),
    gap: scale(2),
  },
  cards: {
    gap: scale(12),
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  chartCard: {
    minHeight: scale(240),
  },
  chartTitle: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(12),
  },
  chartLoading: {
    flex: 1,
    minHeight: scale(180),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  halfCard: {
    flex: 1,
    minHeight: scale(100),
    justifyContent: 'center',
  },
  statCard: {
    minHeight: scale(100),
    justifyContent: 'center',
  },
  statCardAccent: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  statValue: {
    fontFamily: theme.fonts.headerMedium,
    fontSize: scale(28),
    color: theme.colors.textPrimary,
    marginBottom: scale(4),
  },
  statValueAccent: {
    color: theme.colors.white,
  },
  statLabel: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textSecondary,
  },
  statLabelAccent: {
    color: theme.colors.grey400,
  },
  motivationTitle: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    marginBottom: scale(8),
  },
  motivationText: {
    ...theme.typography.body,
    fontSize: scale(13),
    lineHeight: scale(20),
    color: theme.colors.textSecondary,
  },
});
