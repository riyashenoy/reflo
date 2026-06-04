import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
  const [activePeriod, setActivePeriod] = useState<Period>('Week');

  const data = useMemo(() => PERIOD_DATA[activePeriod], [activePeriod]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
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
    backgroundColor: '#f2f0eb',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  heading: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: '#1a1a1a',
    flex: 1,
  },
  periodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e6e0',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  periodOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  periodOptionActive: {
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#0000001a',
  },
  periodOptionText: {
    fontSize: 11,
    color: '#00000055',
  },
  periodOptionTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  cards: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  chartCard: {
    height: 220,
  },
  chartPlaceholder: {
    flex: 1,
    backgroundColor: '#e8e6e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#00000055',
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
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#00000055',
  },
  personalBestCard: {
    alignSelf: 'center',
    width: '70%',
    minHeight: 88,
    alignItems: 'center',
  },
});
