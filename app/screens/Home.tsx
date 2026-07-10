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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  getLibraryWorkoutsForFilter,
  libraryWorkouts,
  type LibraryWorkout,
} from '../data/workoutLibrary';
import { getWorkoutById, type Intensity, type Workout } from '../data/workouts';
import { FadeInView, PressableScale } from '../components/motion';
import { useSavedWorkouts } from '../context/SavedWorkoutsContext';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { auth } from '../lib/firebase';
import { fetchUserProfile } from '../lib/userProfile';
import { useLayoutWidth } from '../hooks/useLayoutWidth';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

const FILTERS = ['Saved', 'Full Body', 'Upper Body', 'Lower Body', 'Core'] as const;
const SAVED_FILTER = 'Saved';
const HORIZONTAL_PADDING = scale(20);
const SECTION_GAP = scale(32);
const CARD_GAP = scale(12);
const GRID_MIN_ITEMS = 4;
const SLIDE_MS = 320;
const HERO_WORKOUT = libraryWorkouts[0];
const SCROLL_BOTTOM_PADDING = scale(140);
/** Darker than theme.grey400 (#BABABA) for readable muted labels on #F3F3F3. */
const MUTED_TEXT = '#6B6B6B';

const STREAK_DAY_LABELS = ['S', 'M', 'T', 'W', 'TH', 'F', 'SA'] as const;
const STREAK_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** Hardcoded for now — wire to Firestore later. */
const streakData = {
  completedDays: ['sunday', 'monday', 'tuesday'],
  today: 'wednesday',
  streakCount: 3,
};

type StreakDisplayDay = {
  key: string;
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
};

function getStreakDaysFromData(data: typeof streakData): StreakDisplayDay[] {
  return STREAK_DAY_KEYS.map((key, index) => {
    const isCompleted = data.completedDays.includes(key);
    const isToday = data.today === key;

    return {
      key,
      label: STREAK_DAY_LABELS[index],
      isCompleted,
      isToday,
      isFuture: !isCompleted && !isToday,
    };
  });
}

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

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

function formatIntensity(intensity: Intensity): string {
  return intensity.charAt(0).toUpperCase() + intensity.slice(1);
}

function formatCategoryLabel(category: string): string {
  return category
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function toSentenceCase(value: string): string {
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
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

function StreakSquare({ day }: { day: StreakDisplayDay }) {
  if (day.isToday) {
    return (
      <View style={styles.streakSquareTodayRing}>
        <View style={styles.streakSquareToday} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.streakSquare,
        day.isCompleted ? styles.streakSquareCompleted : styles.streakSquareFuture,
      ]}
    />
  );
}

function StreakRail({
  days,
  streakCount,
}: {
  days: StreakDisplayDay[];
  streakCount: number;
}) {
  return (
    <View style={styles.streakRail}>
      <View style={styles.streakCountBlock}>
        <Text style={styles.streakCountNumber}>
          {String(streakCount).padStart(2, '0')}
        </Text>
        <Text style={styles.streakCountLabel}>DAY STREAK</Text>
      </View>
      <View style={styles.streakRailColumns}>
        {days.map((day) => (
          <View key={day.key} style={styles.streakColumn}>
            <Text style={styles.streakDayLabel}>{day.label}</Text>
            <StreakSquare day={day} />
          </View>
        ))}
      </View>
    </View>
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
    <Pressable
      onPress={onPress}
      style={styles.filterTab}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={isActive ? styles.filterTabActive : undefined}>
        <Text
          style={[
            styles.filterTabText,
            isActive ? styles.filterTabTextActive : styles.filterTabTextInactive,
          ]}
        >
          {label.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}

function UpNextHeroCard({
  workout,
  workoutMeta,
  onPress,
}: {
  workout: LibraryWorkout;
  workoutMeta: Workout;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.heroCard} onPress={onPress} scaleTo={0.98}>
      <Image source={workout.coverImage} style={styles.heroImage} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(20,18,18,0.95)']}
        locations={[0.35, 1]}
        style={styles.heroGradient}
      />
      <View style={styles.heroEyebrow}>
        <Text style={styles.heroEyebrowNum}>01</Text>
        <Text style={styles.heroEyebrowLabel}> / TODAY</Text>
      </View>
      <View style={styles.heroBottomRow}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroTitle}>{toSentenceCase(workout.title)}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaPrimary}>
              {workoutMeta.duration} MIN / {formatIntensity(workoutMeta.intensity).toUpperCase()}
            </Text>
            <Text style={styles.heroMetaSeparator}> · </Text>
            {workoutMeta.aiTracked ? (
              <View style={styles.heroMetaAiRow}>
                <View style={styles.metaSquare} />
                <Text style={styles.heroMetaAi}>AI TRACKED</Text>
              </View>
            ) : (
              <Text style={styles.heroMetaPrimary}>GUIDED</Text>
            )}
          </View>
        </View>
        <PressableScale
          onPress={onPress}
          style={styles.heroBeginWrap}
          accessibilityRole="button"
          accessibilityLabel="Begin workout"
        >
          <Text style={styles.heroBegin}>BEGIN</Text>
          <View style={styles.heroBeginUnderline} />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

function WorkoutCard({
  workout,
  width,
  index,
  onPress,
  showSavedStar = false,
  onToggleSaved,
}: {
  workout: LibraryWorkout;
  width: number;
  index: number;
  onPress: () => void;
  showSavedStar?: boolean;
  onToggleSaved?: () => void;
}) {
  const workoutMeta = getWorkoutById(workout.workoutId);

  return (
    <View style={[styles.workoutCard, { width }]}>
      <View style={styles.cardImageWrap} pointerEvents="box-none">
        <PressableScale style={styles.cardImagePressable} onPress={onPress}>
          <View style={styles.cardImageFrame}>
            <Image
              source={workout.coverImage}
              style={styles.cardImage}
              resizeMode="cover"
            />
          </View>
        </PressableScale>
        {showSavedStar ? (
          <Pressable
            style={styles.cardStarButton}
            onPress={() => onToggleSaved?.()}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Remove from saved"
          >
            <Ionicons name="star" size={scale(12)} color={theme.colors.teal} />
          </Pressable>
        ) : null}
      </View>
      <PressableScale onPress={onPress}>
        <View style={styles.cardTextStack}>
          <View style={styles.cardRow1}>
            <Text style={styles.cardIndex}>{formatIndex(index)}</Text>
            {workoutMeta ? (
              <Text style={styles.cardDuration}>
                {workoutMeta.duration} MIN
              </Text>
            ) : null}
            {workoutMeta?.aiTracked ? <View style={styles.cardAiSquare} /> : null}
          </View>
          <Text style={styles.cardTitle}>{workout.title.toUpperCase()}</Text>
          {workoutMeta ? (
            <Text style={styles.cardMeta}>
              {formatIntensity(workoutMeta.intensity).toUpperCase()} /{' '}
              {formatCategoryLabel(workout.category).toUpperCase()}
            </Text>
          ) : null}
        </View>
      </PressableScale>
    </View>
  );
}

function WorkoutGrid({
  filter,
  cardWidth,
  savedIds,
  onWorkoutPress,
  onUnsave,
}: {
  filter: string;
  cardWidth: number;
  savedIds: string[];
  onWorkoutPress: (libraryId: string) => void;
  onUnsave: (libraryId: string) => void;
}) {
  const flatWorkouts = useMemo(
    () => buildGridWorkouts(getLibraryWorkoutsForFilter(filter, savedIds), filter),
    [filter, savedIds]
  );

  const rows = useMemo(() => {
    const result: GridLibraryWorkout[][] = [];
    for (let index = 0; index < flatWorkouts.length; index += 2) {
      result.push(flatWorkouts.slice(index, index + 2));
    }
    return result;
  }, [flatWorkouts]);

  if (filter === SAVED_FILTER && rows.length === 0) {
    return (
      <FadeInView style={styles.emptySavedState}>
        <Text style={styles.emptySavedTitle}>No saved workouts yet</Text>
        <Text style={styles.emptySavedText}>
          Tap the star on any class page to bookmark it here. Tap the star on a
          saved card to remove it.
        </Text>
      </FadeInView>
    );
  }

  return (
    <>
      {rows.map((row, rowIndex) => (
        <View key={`${filter}-row-${rowIndex}`} style={styles.cardRow}>
          {row.map((item) => {
            const index = flatWorkouts.findIndex(
              (workout) => workout.gridKey === item.gridKey
            );

            return (
              <WorkoutCard
                key={item.gridKey}
                workout={item}
                width={cardWidth}
                index={index}
                onPress={() => onWorkoutPress(item.id)}
                showSavedStar={filter === SAVED_FILTER}
                onToggleSaved={() => onUnsave(item.id)}
              />
            );
          })}
          {row.length === 1 ? <View style={{ width: cardWidth }} /> : null}
        </View>
      ))}
    </>
  );
}

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const { savedIds, toggleSaved } = useSavedWorkouts();
  const { weekStreakDays } = useWorkoutHistory();
  const tabTopPadding = useTabScreenTopPadding();
  const layoutWidth = useLayoutWidth();
  const reduceMotion = useReducedMotion();
  const [selectedFilter, setSelectedFilter] = useState<string>('Full Body');
  const [displayFilter, setDisplayFilter] = useState<string>('Full Body');
  const [outgoingFilter, setOutgoingFilter] = useState<string | null>(null);
  const [incomingFilter, setIncomingFilter] = useState<string | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [, setFirstName] = useState<string | null>(null);
  const transitionProgress = useRef(new Animated.Value(1)).current;
  const isAnimatingFilter = useRef(false);

  const streakDays = useMemo(() => getStreakDaysFromData(streakData), []);
  void weekStreakDays;

  const heroWorkoutMeta = getWorkoutById(HERO_WORKOUT.workoutId);

  const contentWidth = layoutWidth - HORIZONTAL_PADDING * 2;
  const cardWidth = (contentWidth - CARD_GAP) / 2;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadProfile = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          return;
        }

        try {
          const profile = await fetchUserProfile(uid);
          if (!cancelled) {
            const name = profile?.name?.split(' ')[0]?.trim();
            setFirstName(name || null);
          }
        } catch {
          if (!cancelled) {
            const name = auth.currentUser?.displayName?.split(' ')[0]?.trim();
            setFirstName(name || null);
          }
        }
      };

      void loadProfile();

      return () => {
        cancelled = true;
      };
    }, [])
  );

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

  const timeGreeting = getTimeOfDayGreeting();

  const listHeader = useMemo(
    () => (
      <View style={[styles.headerContent, { paddingTop: tabTopPadding }]}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
        />

        <FadeInView delay={80} style={styles.greetingBlock}>
          <Text style={styles.greetingLine}>
            {`GOOD ${timeGreeting.toUpperCase()}`}
          </Text>
          <Text style={styles.greetingHeadline}>Keep it going.</Text>
        </FadeInView>

        <StreakRail days={streakDays} streakCount={streakData.streakCount} />

        {heroWorkoutMeta ? (
          <UpNextHeroCard
            workout={HERO_WORKOUT}
            workoutMeta={heroWorkoutMeta}
            onPress={() => handleWorkoutPress(HERO_WORKOUT.id)}
          />
        ) : null}

        <View style={styles.librarySection}>
          <View style={styles.libraryHeaderRow}>
            <Text style={styles.sectionHeading}>Workout library</Text>
            <Text style={styles.seeAll}>ALL →</Text>
          </View>
          <View style={styles.sectionRule} />

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
    [
      handleFilterPress,
      handleWorkoutPress,
      heroWorkoutMeta,
      selectedFilter,
      streakDays,
      tabTopPadding,
      timeGreeting,
    ]
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
                  onUnsave={toggleSaved}
                />
              </View>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const SQUARE_SIZE = scale(4);
const TODAY_RING_SIZE = scale(10);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  headerContent: {
    gap: SECTION_GAP,
  },
  logo: {
    width: scale(64),
    height: scale(32),
    resizeMode: 'contain',
  },
  greetingBlock: {
    gap: scale(6),
  },
  greetingLine: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.6),
    color: MUTED_TEXT,
    textTransform: 'uppercase',
  },
  greetingHeadline: {
    fontFamily: theme.fonts.header,
    fontSize: scale(44),
    lineHeight: scale(44),
    letterSpacing: scale(-1.2),
    color: theme.colors.textPrimary,
  },
  streakRail: {
    height: scale(44),
    borderTopWidth: scale(0.5),
    borderBottomWidth: scale(0.5),
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  streakRailColumns: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: scale(8),
  },
  streakColumn: {
    alignItems: 'center',
    gap: scale(6),
  },
  streakDayLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: MUTED_TEXT,
    textTransform: 'uppercase',
  },
  streakSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  streakSquareCompleted: {
    backgroundColor: theme.colors.red,
  },
  streakSquareFuture: {
    backgroundColor: theme.colors.grey200,
  },
  streakSquareTodayRing: {
    width: TODAY_RING_SIZE,
    height: TODAY_RING_SIZE,
    borderWidth: scale(1),
    borderColor: theme.colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakSquareToday: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: theme.colors.red,
  },
  streakCountBlock: {
    marginRight: scale(16),
    paddingTop: scale(8),
    alignItems: 'flex-start',
  },
  streakCountNumber: {
    fontFamily: theme.fonts.header,
    fontSize: scale(20),
    color: theme.colors.textPrimary,
    lineHeight: scale(20),
  },
  streakCountLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(8),
    color: MUTED_TEXT,
    letterSpacing: scale(0.8),
    marginTop: scale(4),
  },
  heroCard: {
    height: scale(260),
    borderRadius: scale(4),
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroEyebrow: {
    position: 'absolute',
    top: scale(16),
    left: scale(16),
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroEyebrowNum: {
    fontFamily: theme.fonts.header,
    fontSize: scale(13),
    color: theme.colors.white,
  },
  heroEyebrowLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: scale(16),
    gap: scale(16),
  },
  heroTextBlock: {
    flex: 1,
    gap: scale(8),
  },
  heroTitle: {
    fontFamily: theme.fonts.header,
    fontSize: scale(26),
    color: theme.colors.white,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heroMetaPrimary: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },
  heroMetaSeparator: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.65)',
  },
  heroMetaAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  metaSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: theme.colors.teal,
  },
  heroMetaAi: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
    color: theme.colors.teal,
    textTransform: 'uppercase',
  },
  heroBeginWrap: {
    alignItems: 'center',
    paddingBottom: scale(2),
  },
  heroBegin: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(2),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  heroBeginUnderline: {
    marginTop: scale(4),
    height: scale(1),
    width: '100%',
    backgroundColor: theme.colors.white,
  },
  librarySection: {},
  libraryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: scale(8),
  },
  sectionHeading: {
    flex: 1,
    flexShrink: 1,
    fontFamily: theme.fonts.header,
    fontSize: scale(20),
    color: theme.colors.textPrimary,
  },
  seeAll: {
    flexShrink: 0,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: MUTED_TEXT,
    textTransform: 'uppercase',
  },
  sectionRule: {
    borderBottomWidth: scale(0.5),
    borderBottomColor: theme.colors.border,
    marginBottom: scale(14),
  },
  filterRow: {
    flexDirection: 'row',
    gap: scale(20),
    paddingRight: scale(4),
  },
  filterTab: {
    paddingVertical: scale(6),
  },
  filterTabActive: {
    borderBottomWidth: scale(2),
    borderBottomColor: theme.colors.red,
    alignSelf: 'flex-start',
  },
  filterTabText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: theme.colors.textPrimary,
  },
  filterTabTextInactive: {
    color: MUTED_TEXT,
  },
  gridContainer: {
    minHeight: scale(200),
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: scale(20),
  },
  gridStrip: {
    flexDirection: 'row',
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
    gap: scale(8),
  },
  cardImageWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  cardImagePressable: {
    width: '100%',
  },
  cardImageFrame: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    backgroundColor: theme.colors.grey200,
    borderRadius: scale(2),
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  cardStarButton: {
    position: 'absolute',
    top: scale(8),
    left: scale(8),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: 'rgba(121, 203, 208, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  cardTextStack: {
    borderTopWidth: scale(0.5),
    borderTopColor: theme.colors.border,
    paddingTop: scale(8),
  },
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIndex: {
    fontFamily: theme.fonts.header,
    fontSize: scale(11),
    color: MUTED_TEXT,
  },
  cardDuration: {
    flex: 1,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: MUTED_TEXT,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  cardAiSquare: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    backgroundColor: theme.colors.teal,
    marginLeft: scale(8),
  },
  cardTitle: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(0.8),
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    marginTop: scale(6),
  },
  cardMeta: {
    fontFamily: theme.fonts.body,
    fontSize: scale(9),
    letterSpacing: scale(0.6),
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    marginTop: scale(2),
  },
  emptySavedState: {
    paddingVertical: scale(32),
    paddingHorizontal: scale(8),
    alignItems: 'center',
  },
  emptySavedTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(13),
    color: theme.colors.textPrimary,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  emptySavedText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(16),
  },
});
