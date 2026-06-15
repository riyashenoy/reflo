import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
const CROSSFADE_MS = 300;
const HORIZONTAL_SLIDE = scale(28);

function getFilterIndex(filter: string): number {
  return FILTERS.indexOf(filter as (typeof FILTERS)[number]);
}

function getFilterDirection(from: string, to: string): 1 | -1 {
  const fromIndex = getFilterIndex(from);
  const toIndex = getFilterIndex(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return 1;
  }
  return toIndex > fromIndex ? 1 : -1;
}

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

type GridWorkout = Workout & { gridKey: string };

function matchesFilter(workout: Workout, activeFilter: string): boolean {
  const filterTag = activeFilter.toLowerCase();
  return workout.tags.some((tag) => tag.toLowerCase() === filterTag);
}

function buildGridWorkouts(
  items: Workout[],
  filter: string,
  minItems = GRID_MIN_ITEMS
): GridWorkout[] {
  const base = items.length > 0 ? items : workouts;
  const result: GridWorkout[] = base.map((workout, index) => ({
    ...workout,
    gridKey: `${filter}-${workout.id}-${index}`,
  }));

  let cycleIndex = 0;
  while (result.length < minItems) {
    const workout = base[cycleIndex % base.length];
    result.push({
      ...workout,
      gridKey: `${filter}-${workout.id}-repeat-${result.length}`,
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

function WorkoutGrid({
  filter,
  cardWidth,
  onWorkoutPress,
}: {
  filter: string;
  cardWidth: number;
  onWorkoutPress: (workoutId: string) => void;
}) {
  const rows = useMemo(() => {
    const matched = workouts.filter((workout) =>
      matchesFilter(workout, filter)
    );
    const filteredWorkouts = buildGridWorkouts(
      matched.length > 0 ? matched : workouts,
      filter
    );
    const result: GridWorkout[][] = [];
    for (let index = 0; index < filteredWorkouts.length; index += 2) {
      result.push(filteredWorkouts.slice(index, index + 2));
    }
    return result;
  }, [filter]);

  return (
    <>
      {rows.map((row, rowIndex) => (
        <View key={`${filter}-row-${rowIndex}`} style={styles.cardRow}>
          {row.map((item) => (
            <WorkoutCard
              key={item.gridKey}
              workout={item}
              width={cardWidth}
              onPress={() => onWorkoutPress(item.id)}
            />
          ))}
          {row.length === 1 ? <View style={{ width: cardWidth }} /> : null}
        </View>
      ))}
    </>
  );
}

function FilterPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const activeProgress = useRef(
    new Animated.Value(isActive ? 1 : 0)
  ).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: isActive ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [activeProgress, isActive]);

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.grey200, theme.colors.dark],
  });

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.96,
      friction: 7,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 7,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.filterPill,
          { backgroundColor, transform: [{ scale: pressScale }] },
        ]}
      >
        <Text style={styles.filterPillText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
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
  const [selectedFilter, setSelectedFilter] = useState<string>('Full Body');
  const [displayFilter, setDisplayFilter] = useState<string>('Full Body');
  const [outgoingFilter, setOutgoingFilter] = useState<string | null>(null);
  const [incomingFilter, setIncomingFilter] = useState<string | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const transitionProgress = useRef(new Animated.Value(1)).current;
  const isAnimatingFilter = useRef(false);

  const cardWidth =
    (contentWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  const handleWorkoutPress = useCallback(
    (workoutId: string) => {
      navigation.navigate('ClassDetail', { workoutId });
    },
    [navigation]
  );

  const outgoingOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const incomingOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const outgoingTranslateX = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -transitionDirection * HORIZONTAL_SLIDE],
  });
  const incomingTranslateX = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [transitionDirection * HORIZONTAL_SLIDE, 0],
  });

  const handleFilterPress = useCallback(
    (filter: string) => {
      if (filter === selectedFilter || isAnimatingFilter.current) {
        return;
      }

      const direction = getFilterDirection(displayFilter, filter);

      setSelectedFilter(filter);
      setTransitionDirection(direction);
      setOutgoingFilter(displayFilter);
      setIncomingFilter(filter);
      isAnimatingFilter.current = true;
      transitionProgress.setValue(0);

      Animated.timing(transitionProgress, {
        toValue: 1,
        duration: CROSSFADE_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setDisplayFilter(filter);
        }
        setOutgoingFilter(null);
        setIncomingFilter(null);
        isAnimatingFilter.current = false;
      });
    },
    [displayFilter, selectedFilter, transitionProgress]
  );

  const listHeader = useMemo(
    () => (
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
            {FILTERS.map((filter) => (
              <FilterPill
                key={filter}
                label={filter}
                isActive={selectedFilter === filter}
                onPress={() => handleFilterPress(filter)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    ),
    [handleFilterPress, selectedFilter, tabTopPadding]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {listHeader}

        <View style={styles.gridContainer}>
          {outgoingFilter && incomingFilter ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  opacity: outgoingOpacity,
                  transform: [{ translateX: outgoingTranslateX }],
                }}
              >
                <WorkoutGrid
                  filter={outgoingFilter}
                  cardWidth={cardWidth}
                  onWorkoutPress={handleWorkoutPress}
                />
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.gridLayer,
                  {
                    opacity: incomingOpacity,
                    transform: [{ translateX: incomingTranslateX }],
                  },
                ]}
              >
                <WorkoutGrid
                  filter={incomingFilter}
                  cardWidth={cardWidth}
                  onWorkoutPress={handleWorkoutPress}
                />
              </Animated.View>
            </>
          ) : (
            <WorkoutGrid
              filter={displayFilter}
              cardWidth={cardWidth}
              onWorkoutPress={handleWorkoutPress}
            />
          )}
        </View>
      </ScrollView>
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
  gridContainer: {
    minHeight: scale(200),
    overflow: 'hidden',
  },
  gridLayer: {
    ...StyleSheet.absoluteFill,
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
  },
  filterPillText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  cardRow: {
    flexDirection: 'row',
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
