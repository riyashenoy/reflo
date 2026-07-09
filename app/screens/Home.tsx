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
import { FadeInView, PressableScale, StreakDayCircle } from '../components/motion';
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
const HORIZONTAL_PADDING = theme.component.screenPaddingHorizontal;
const SECTION_GAP = theme.spacing.xxxl;
const WITHIN_SECTION_GAP = theme.spacing.lg;
const CARD_GAP = scale(12);
const GRID_MIN_ITEMS = 4;
const SLIDE_MS = 320;
const HERO_WORKOUT = libraryWorkouts[0];
const SCROLL_BOTTOM_PADDING = scale(140);

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
      style={[styles.filterPill, isActive ? styles.filterPillActive : styles.filterPillInactive]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Text
        style={[
          styles.filterPillText,
          isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
        ]}
      >
        {label.toUpperCase()}
      </Text>
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
        colors={['rgba(20,18,18,0.1)', 'rgba(20,18,18,0.55)', 'rgba(20,18,18,0.92)']}
        locations={[0, 0.55, 1]}
        style={styles.heroGradient}
      />
      <LinearGradient
        colors={['rgba(20,18,18,0.5)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroLeftGradient}
      />
      <View style={styles.heroBadge}>
        <Text style={styles.heroBadgeText}>UP NEXT · TODAY</Text>
      </View>
      <View style={styles.heroBottomRow}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroTitle}>{workout.title.toUpperCase()}</Text>
          <Text style={styles.heroMeta}>
            {workoutMeta.duration} min · {formatIntensity(workoutMeta.intensity)} ·{' '}
            {workoutMeta.aiTracked ? (
              <Text style={styles.heroMetaAi}>✦ AI tracked</Text>
            ) : (
              'Guided'
            )}
          </Text>
        </View>
        <PressableScale
          style={styles.heroPlayButton}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Open workout"
        >
          <Ionicons
            name="play"
            size={scale(18)}
            color={theme.colors.textPrimary}
            style={styles.heroPlayIcon}
          />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

function WorkoutCard({
  workout,
  width,
  onPress,
  showSavedStar = false,
  onToggleSaved,
}: {
  workout: LibraryWorkout;
  width: number;
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
          {workoutMeta ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationPillText}>
                {workoutMeta.duration} MIN
              </Text>
            </View>
          ) : null}
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
        <Text style={styles.cardTitle}>
          {workoutMeta?.aiTracked ? (
            <Text style={styles.cardAiMark}>✦ </Text>
          ) : null}
          {workout.title.toUpperCase()}
        </Text>
        {workoutMeta ? (
          <Text style={styles.cardMeta}>
            {formatIntensity(workoutMeta.intensity)} ·{' '}
            {formatCategoryLabel(workout.category)}
          </Text>
        ) : null}
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
          {row.map((item) => (
            <WorkoutCard
              key={item.gridKey}
              workout={item}
              width={cardWidth}
              onPress={() => onWorkoutPress(item.id)}
              showSavedStar={filter === SAVED_FILTER}
              onToggleSaved={() => onUnsave(item.id)}
            />
          ))}
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
  const [firstName, setFirstName] = useState<string | null>(null);
  const transitionProgress = useRef(new Animated.Value(1)).current;
  const isAnimatingFilter = useRef(false);

  const streakDays = useMemo(() => getStreakDaysFromData(streakData), []);
  const todayWorkoutDone = weekStreakDays.some(
    (day) => day.isToday && day.isCompleted
  );

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
            {firstName
              ? `Good ${timeGreeting}, ${firstName}`
              : `Good ${timeGreeting}.`}
          </Text>
          <Text style={styles.greetingHeadline}>
            {todayWorkoutDone ? 'You showed up.' : 'Keep it going.'}
          </Text>
        </FadeInView>

        <View style={styles.streakSection}>
          <View style={styles.streakRow}>
            {streakDays.map((day, index) => (
              <StreakDayCircle
                key={day.key}
                label={day.label}
                isCompleted={day.isCompleted}
                isToday={day.isToday}
                isFuture={day.isFuture}
                index={index}
              />
            ))}
          </View>
          <Text style={styles.streakCaption}>
            {streakData.streakCount} day streak 🔥
          </Text>
        </View>

        {heroWorkoutMeta ? (
          <UpNextHeroCard
            workout={HERO_WORKOUT}
            workoutMeta={heroWorkoutMeta}
            onPress={() => handleWorkoutPress(HERO_WORKOUT.id)}
          />
        ) : null}

        <View style={styles.librarySection}>
          <View style={styles.libraryHeaderRow}>
            <Text style={styles.sectionHeading}>Workout Library</Text>
            <Text style={styles.seeAll}>See all</Text>
          </View>

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
      firstName,
      handleFilterPress,
      handleWorkoutPress,
      heroWorkoutMeta,
      selectedFilter,
      streakDays,
      tabTopPadding,
      timeGreeting,
      todayWorkoutDone,
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
    gap: scale(4),
  },
  greetingLine: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.textSecondary,
  },
  greetingHeadline: {
    fontFamily: theme.fonts.header,
    fontSize: scale(34),
    letterSpacing: scale(-0.5),
    color: theme.colors.textPrimary,
  },
  streakSection: {
    gap: WITHIN_SECTION_GAP,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(2),
  },
  streakCaption: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(12),
    color: theme.colors.textPrimary,
  },
  heroCard: {
    height: scale(200),
    borderRadius: theme.radius.xl,
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
  heroLeftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
  },
  heroBadge: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: scale(0.5),
    borderColor: theme.colors.white,
  },
  heroBadgeText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.5),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroTextBlock: {
    flex: 1,
    gap: scale(4),
  },
  heroTitle: {
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    color: theme.colors.white,
  },
  heroMeta: {
    fontFamily: theme.fonts.body,
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.7)',
  },
  heroMetaAi: {
    color: theme.colors.teal,
  },
  heroPlayButton: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlayIcon: {
    marginLeft: scale(2),
  },
  librarySection: {
    gap: WITHIN_SECTION_GAP,
  },
  libraryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
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
    fontFamily: theme.fonts.body,
    fontSize: scale(12),
    color: theme.colors.red,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingRight: scale(4),
  },
  filterPill: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: theme.radius.full,
  },
  filterPillActive: {
    backgroundColor: theme.colors.textPrimary,
  },
  filterPillInactive: {
    backgroundColor: 'transparent',
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  filterPillText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(0.88),
    textTransform: 'uppercase',
  },
  filterPillTextActive: {
    color: theme.colors.white,
  },
  filterPillTextInactive: {
    color: theme.colors.textSecondary,
  },
  gridContainer: {
    minHeight: scale(200),
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: WITHIN_SECTION_GAP,
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
    gap: scale(6),
  },
  cardImageWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: scale(14),
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
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  durationPill: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(20,18,18,0.6)',
    borderWidth: scale(1),
    borderColor: 'rgba(255,255,255,0.2)',
  },
  durationPillText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  cardStarButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: 'rgba(121, 203, 208, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  cardTitle: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    color: theme.colors.textPrimary,
    paddingHorizontal: scale(2),
  },
  cardAiMark: {
    color: theme.colors.teal,
  },
  cardMeta: {
    fontFamily: theme.fonts.body,
    fontSize: scale(10),
    color: theme.colors.grey400,
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
