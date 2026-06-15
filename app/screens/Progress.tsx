import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import theme, { scale } from '../theme';

type Period = 'Week' | 'Month' | 'All time';

const PERIODS: Period[] = ['Week', 'Month', 'All time'];

const PERIOD_DATA: Record<
  Period,
  {
    sessions: number;
    streak: number;
    bestScore: number;
    corrections: number;
  }
> = {
  Week: { sessions: 4, streak: 4, bestScore: 89, corrections: 6 },
  Month: { sessions: 12, streak: 4, bestScore: 96, corrections: 24 },
  'All time': { sessions: 28, streak: 7, bestScore: 96, corrections: 58 },
};

function StatCard({
  value,
  label,
  style,
}: {
  value: number | string;
  label: string;
  style?: object;
}) {
  return (
    <View style={[styles.card, styles.statCard, style]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function Progress() {
  const tabTopPadding = useTabScreenTopPadding();
  const [activePeriod, setActivePeriod] = useState<Period>('Week');

  const data = useMemo(() => PERIOD_DATA[activePeriod], [activePeriod]);

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
          {PERIODS.map((period) => {
            const isActive = activePeriod === period;
            return (
              <Pressable
                key={period}
                style={[
                  styles.periodOption,
                  isActive && styles.periodOptionActive,
                ]}
                onPress={() => setActivePeriod(period)}
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    isActive && styles.periodOptionTextActive,
                  ]}
                >
                  {period}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.cards}>
        <View style={[styles.card, styles.chartCard]}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              Form Score Over Time
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard
            value={data.sessions}
            label="Sessions Done"
            style={styles.halfCard}
          />
          <StatCard
            value={data.streak}
            label="Streak"
            style={styles.halfCard}
          />
        </View>

        <StatCard value={data.corrections} label="Top Corrections" />

        <StatCard
          value={data.bestScore}
          label="Personal Best"
          style={styles.personalBestCard}
        />
      </View>
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
  periodOption: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: theme.radius.full,
  },
  periodOptionActive: {
    backgroundColor: theme.colors.white,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  periodOptionText: {
    ...theme.typography.body,
    fontSize: scale(11),
    color: theme.colors.textSecondary,
  },
  periodOptionTextActive: {
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textPrimary,
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
    height: scale(220),
  },
  chartPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.grey200,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
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
  statValue: {
    fontFamily: theme.fonts.headerMedium,
    fontSize: scale(28),
    color: theme.colors.textPrimary,
    marginBottom: scale(4),
  },
  statLabel: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textSecondary,
  },
  personalBestCard: {
    alignSelf: 'center',
    width: '70%',
    minHeight: scale(88),
    alignItems: 'center',
  },
});
