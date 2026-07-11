import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FormScoreChart, ProgressEmptyState } from '../components/FormScoreChart';
import { FadeInView } from '../components/motion';
import { useLayoutWidth } from '../hooks/useLayoutWidth';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import {
  buildProgressSummary,
  type ProgressPeriod,
} from '../lib/progressStats';
import theme, { scale } from '../theme';

const PERIODS: ProgressPeriod[] = ['Week', 'Month', 'All time'];
const WARM_RULE = '#E4E2DD';

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
  const { entries, streak, isLoading } = useWorkoutHistory();
  const [activePeriod, setActivePeriod] = useState<ProgressPeriod>('Week');

  const chartWidth = layoutWidth - scale(40);

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
        <SectionEyebrow title="FORM SCORE OVER TIME" />
        {isLoading ? (
          <Text style={styles.emptyMessage}>Loading workouts…</Text>
        ) : summary.hasData ? (
          <FormScoreChart points={summary.chartPoints} width={chartWidth} />
        ) : (
          <ProgressEmptyState />
        )}

        {summary.hasData ? (
          <>
            <View style={styles.statsRule} />
            <View style={styles.statRow}>
              <StatBlock value={summary.sessions} label="SESSIONS DONE" />
              <StatBlock value={summary.streak} label="CURRENT STREAK" />
            </View>

            <View style={styles.statsRule} />
            <View style={styles.statRow}>
              <StatBlock value={summary.averageScore} label="AVERAGE FORM SCORE" />
              <StatBlock value={summary.bestScore} label="PERSONAL BEST" />
            </View>
          </>
        ) : !isLoading ? (
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
