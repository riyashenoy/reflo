import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import theme from '../theme';

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
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  heading: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    fontSize: 28,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.grey200,
    borderRadius: theme.radius.full,
    padding: 3,
    gap: 2,
  },
  periodOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  periodOptionActive: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodOptionText: {
    ...theme.typography.body,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  periodOptionTextActive: {
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textPrimary,
  },
  cards: {
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartCard: {
    height: 220,
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
    gap: 12,
  },
  halfCard: {
    flex: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  statCard: {
    minHeight: 100,
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: theme.fonts.headerMedium,
    fontSize: 28,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    ...theme.typography.body,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  personalBestCard: {
    alignSelf: 'center',
    width: '70%',
    minHeight: 88,
    alignItems: 'center',
  },
});
