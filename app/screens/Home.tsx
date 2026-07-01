import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getLibraryWorkoutsForFilter,
  type LibraryWorkout,
} from '../data/workoutLibrary';
import {
  CrossfadeText,
  FadeInView,
  PressableScale,
  SegmentPill,
  StreakDayCircle,
} from '../components/motion';
import { useSavedWorkouts } from '../context/SavedWorkoutsContext';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { getStreakHeading } from '../lib/workoutHistory';
import { useLayoutWidth } from '../hooks/useLayoutWidth';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

const FILTERS = ['Saved', 'Full Body', 'Upper Body', 'Lower Body', 'Core'] as const;
const SAVED_FILTER = 'Saved';
const HORIZONTAL_PADDING = scale(20);
const CARD_GAP = scale(12);
const GRID_MIN_ITEMS = 4;
const SLIDE_MS = 320;

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

type GridLibraryWorkout = LibraryWorkout & { gridKey: string };

function buildGridWorkouts(
  items: LibraryWorkout[],
  filter: string,
  minItems = GRID_MIN_ITEMS
): GridLibraryWorkout[] {
  if (filter === SAVED_FILTER) {
    return items.map((workout, index) => ({
      ...workout,
      gridKey: `${filter}-${workout.id}-${index}`,
    }));
  }

  const result: GridLibraryWorkout[] = items.map((workout, index) => ({
    ...workout,
    gridKey: `${filter}-${workout.id}-${index}`,
  }));

  let cycleIndex = 0;
  while (result.length < minItems && items.length > 0) {
    const workout = items[cycleIndex % items.length];
    result.push({
      ...workout,
      gridKey: `${filter}-${workout.id}-repeat-${result.length}`,
    });
    cycleIndex += 1;
  }

  return result;
}

function WorkoutGrid({
  filter,
  cardWidth,
  savedIds,
  onWorkoutPress,
}: {
  filter: string;
  cardWidth: number;
  savedIds: string[];
  onWorkoutPress: (libraryId: string) => void;
}) {
  const rows = useMemo(() => {
    const filteredWorkouts = buildGridWorkouts(
      getLibraryWorkoutsForFilter(filter, savedIds),
      filter
    );
    const result: GridLibraryWorkout[][] = [];
    for (let index = 0; index < filteredWorkouts.length; index += 2) {
      result.push(filteredWorkouts.slice(index, index + 2));
    }
    return result;
  }, [filter, savedIds]);

  if (filter === SAVED_FILTER && rows.length === 0) {
    return (
      <FadeInView style={styles.emptySavedState}>
        <Text style={styles.emptySavedTitle}>No saved workouts yet</Text>
        <Text style={styles.emptySavedText}>
          Tap the star on any class page to bookmark it here.
        </Text>
      </FadeInView>
    );
  }

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
  return (
    <SegmentPill label={label} isActive={isActive} onPress={onPress} />
  );
}

function WorkoutCard({
  workout,
  width,
  onPress,
}: {
  workout: LibraryWorkout;
  width: number;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[styles.workoutCard, { width }]}
      onPress={onPress}
    >
      <Image
        source={workout.coverImage}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <Text style={styles.cardTitle}>{workout.title.toUpperCase()}</Text>
    </PressableScale>
  );
}

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const { savedIds } = useSavedWorkouts();
  const { streak, weekStreakDays } = useWorkoutHistory();
  const tabTopPadding = useTabScreenTopPadding();
  const layoutWidth = useLayoutWidth();
  const reduceMotion = useReducedMotion();
  const [selectedFilter, setSelectedFilter] = useState<string>('Full Body');
  const [displayFilter, setDisplayFilter] = useState<string>('Full Body');
  const [outgoingFilter, setOutgoingFilter] = useState<string | null>(null);
  const [incomingFilter, setIncomingFilter] = useState<string | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const transitionProgress = useRef(new Animated.Value(1)).current;
  const isAnimatingFilter = useRef(false);

  const contentWidth = layoutWidth - HORIZONTAL_PADDING * 2;
  const cardWidth = (contentWidth - CARD_GAP) / 2;

  const handleWorkoutPress = useCallback(
    (libraryId: string) => {
      navigation.navigate('ClassDetail', { libraryId });
    },
    [navigation]
  );

  const handleFilterPress = useCallback(
    (filter: string) => {
      if (filter === selectedFilter || isAnimatingFilter.current) {
        return;
      }

      if (reduceMotion) {
        setSelectedFilter(filter);
        setDisplayFilter(filter);
        return;
      }

      const direction = getFilterDirection(displayFilter, filter);
      transitionProgress.setValue(0);
      setSelectedFilter(filter);
      setTransitionDirection(direction);
      setOutgoingFilter(displayFilter);
      setIncomingFilter(filter);
    },
    [displayFilter, reduceMotion, selectedFilter, transitionProgress]
  );

  useEffect(() => {
    if (!outgoingFilter || !incomingFilter) {
      return;
    }

    isAnimatingFilter.current = true;

    const frame = requestAnimationFrame(() => {
      Animated.timing(transitionProgress, {
        toValue: 1,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setDisplayFilter(incomingFilter);
        }
        setOutgoingFilter(null);
        setIncomingFilter(null);
        isAnimatingFilter.current = false;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [incomingFilter, outgoingFilter, transitionProgress]);

  const isTransitioning = outgoingFilter !== null && incomingFilter !== null;
  const slidePanels = isTransitioning
    ? transitionDirection === 1
      ? [outgoingFilter, incomingFilter]
      : [incomingFilter, outgoingFilter]
    : [displayFilter];
  const slideTranslateX = isTransitioning
    ? transitionProgress.interpolate({
        inputRange: [0, 1],
        outputRange:
          transitionDirection === 1
            ? [0, -contentWidth]
            : [-contentWidth, 0],
      })
    : 0;

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerContent, { paddingTop: tabTopPadding }]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <FadeInView delay={80}>
          <CrossfadeText
            text={getStreakHeading(streak)}
            style={styles.heading}
          />
        </FadeInView>

        <View style={styles.streakRow}>
          {weekStreakDays.map((day, index) => (
            <StreakDayCircle
              key={day.dateKey}
              label={day.label}
              isCompleted={day.isCompleted}
              isToday={day.isToday}
              index={index}
            />
          ))}
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
    [handleFilterPress, selectedFilter, streak, tabTopPadding, weekStreakDays]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {listHeader}

        <View style={[styles.gridContainer, { width: contentWidth }]}>
          <Animated.View
            pointerEvents={isTransitioning ? 'none' : 'auto'}
            style={[
              styles.gridStrip,
              {
                width: contentWidth * slidePanels.length,
                transform: [{ translateX: slideTranslateX }],
              },
            ]}
          >
            {slidePanels.map((filter) => (
              <View key={filter} style={{ width: contentWidth }}>
                <WorkoutGrid
                  filter={filter}
                  cardWidth={cardWidth}
                  savedIds={savedIds}
                  onWorkoutPress={handleWorkoutPress}
                />
              </View>
            ))}
          </Animated.View>
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
    alignSelf: 'center',
  },
  gridStrip: {
    flexDirection: 'row',
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
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radius.sm,
    marginBottom: scale(10),
    backgroundColor: theme.colors.grey200,
  },
  cardTitle: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textPrimary,
    paddingHorizontal: scale(2),
  },
  emptySavedState: {
    paddingVertical: scale(32),
    paddingHorizontal: scale(8),
    alignItems: 'center',
  },
  emptySavedTitle: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textPrimary,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  emptySavedText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(18),
  },
});
