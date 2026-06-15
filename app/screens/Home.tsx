import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { workouts, type Workout } from '../data/workouts';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { contentWidth, scale } from '../theme';

const FILTERS = ['Full Body', 'Upper Body', 'Lower Body', 'Core'] as const;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'] as const;
const COMPLETED_DAY_COUNT = 3;
const HORIZONTAL_PADDING = scale(20);
const CARD_GAP = scale(12);
const GRID_MIN_ITEMS = 4;

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

type GridWorkout = Workout & { gridKey: string };

function matchesFilter(workout: Workout, activeFilter: string): boolean {
  const filterTag = activeFilter.toLowerCase();
  return workout.tags.some((tag) => tag.toLowerCase() === filterTag);
}

function buildGridWorkouts(items: Workout[], minItems = GRID_MIN_ITEMS): GridWorkout[] {
  const base = items.length > 0 ? items : workouts;
  const result: GridWorkout[] = base.map((workout, index) => ({
    ...workout,
    gridKey: `${workout.id}-${index}`,
  }));

  let cycleIndex = 0;
  while (result.length < minItems) {
    const workout = base[cycleIndex % base.length];
    result.push({
      ...workout,
      gridKey: `${workout.id}-repeat-${result.length}`,
    });
    cycleIndex += 1;
  }

  return result;
}

function getStreakDayStatus(dayIndex: number) {
  if (dayIndex < COMPLETED_DAY_COUNT) {
    return 'completed';
  }
  return 'incomplete';
}

function WorkoutCard({
  workout,
  width,
  onPress,
}: {
  workout: Workout;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.workoutCard, { width }]} onPress={onPress}>
      <View style={styles.cardImagePlaceholder} />
      <Text style={styles.cardTitle}>{workout.title.toUpperCase()}</Text>
    </Pressable>
  );
}

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();
  const [activeFilter, setActiveFilter] = useState<string>('Full Body');

  const filteredWorkouts = useMemo(() => {
    const matched = workouts.filter((workout) =>
      matchesFilter(workout, activeFilter)
    );
    return buildGridWorkouts(matched.length > 0 ? matched : workouts);
  }, [activeFilter]);

  const cardWidth =
    (contentWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  const renderHeader = () => (
    <View style={[styles.headerContent, { paddingTop: tabTopPadding }]}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.heading}>Keep it Going</Text>

      <View style={styles.streakRow}>
        {DAY_LABELS.map((label, index) => {
          const status = getStreakDayStatus(index);
          return (
            <View key={label} style={styles.streakDay}>
              <Text style={styles.streakLabel}>{label}</Text>
              <View
                style={[
                  styles.streakCircle,
                  status === 'completed'
                    ? styles.streakCircleCompleted
                    : styles.streakCircleIncomplete,
                ]}
              >
                {status === 'completed' ? (
                  <Text style={styles.streakCheckmark}>✓</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionHeading}>Workout Library</Text>

      <View style={styles.filterSection}>
        <Text style={styles.sectionSubtitle}>PICK YOUR WORKOUT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.gridKey}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            width={cardWidth}
            onPress={() =>
              navigation.navigate('ClassDetail', { workoutId: item.id })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: scale(120),
  },
  headerContent: {
    paddingBottom: scale(8),
  },
  logo: {
    width: scale(72),
    height: scale(36),
    resizeMode: 'contain',
    marginBottom: scale(20),
  },
  heading: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    marginBottom: scale(24),
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(36),
    paddingHorizontal: scale(2),
  },
  streakDay: {
    alignItems: 'center',
    minWidth: scale(28),
  },
  streakLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.textSecondary,
    marginBottom: scale(8),
  },
  streakCircle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCircleCompleted: {
    backgroundColor: theme.colors.red,
  },
  streakCircleIncomplete: {
    backgroundColor: theme.colors.grey200,
  },
  streakCheckmark: {
    color: theme.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
  },
  sectionHeading: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    marginBottom: scale(20),
  },
  filterSection: {
    marginBottom: scale(20),
  },
  sectionSubtitle: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(10),
  },
  filterRow: {
    flexDirection: 'row',
    gap: scale(10),
    paddingRight: scale(4),
  },
  filterPill: {
    paddingHorizontal: scale(18),
    paddingVertical: scale(10),
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.grey200,
  },
  filterPillActive: {
    backgroundColor: theme.colors.dark,
  },
  filterPillText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  filterPillTextActive: {
    color: theme.colors.white,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  workoutCard: {
    marginBottom: scale(4),
    flexGrow: 0,
    flexShrink: 0,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.grey200,
    borderRadius: theme.radius.sm,
    marginBottom: scale(10),
  },
  cardTitle: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textPrimary,
    paddingHorizontal: scale(2),
  },
});
