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
import { getWorkoutById, type Workout } from '../data/workouts';
import { FadeInView, PressableScale } from '../components/motion';
import { useSavedWorkouts } from '../context/SavedWorkoutsContext';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import { auth } from '../lib/firebase';
import { fetchUserProfile } from '../lib/userProfile';
import type { HomeStreakDay } from '../lib/workoutHistory';
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
/** Hero uses cover1; Full Body Burn card uses cover6 so they don’t match. */
const HERO_COVER = require('../../assets/images/cover/cover1.jpg');
const SCROLL_BOTTOM_PADDING = scale(140);

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

function StreakSquare({ day }: { day: HomeStreakDay }) {
  if (day.isToday) {
    return <View style={styles.streakSquareToday} />;
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
  days: HomeStreakDay[];
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
          <View key={day.dateKey} style={styles.streakColumn}>
            <Text
              style={[
                styles.streakDayLabel,
                day.isToday && styles.streakDayLabelToday,
              ]}
            >
              {day.label}
            </Text>
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
  const isSaved = label === SAVED_FILTER;

  return (
    <Pressable
      onPress={onPress}
      style={styles.filterTab}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View
        style={
          isActive
            ? [
                styles.filterTabActive,
                isSaved && styles.filterTabActiveSaved,
              ]
            : undefined
        }
      >
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
      <Image source={HERO_COVER} style={styles.heroImage} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(20,18,18,0.95)']}
        locations={[0.35, 1]}
        style={styles.heroGradient}
      />
      <View style={styles.heroDifficultyRow}>
        {Array.from({ length: workout.difficulty }, (_, index) => (
          <View key={`hero-difficulty-${index}`} style={styles.heroDifficultySquare} />
        ))}
      </View>
      <View style={styles.heroBottomRow}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroMetaPrimary}>
            {workoutMeta.duration} MIN
          </Text>
          <Text style={styles.heroTitle}>{workout.title.toUpperCase()}</Text>
          <Text
            style={styles.heroDescription}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {workout.description}
          </Text>
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
            {workoutMeta ? (
              <Text style={styles.cardDuration}>
                {workoutMeta.duration} MIN
              </Text>
            ) : (
              <View />
            )}
            <View style={styles.difficultyRow}>
              {Array.from({ length: workout.difficulty }, (_, index) => (
                <View key={`difficulty-${index}`} style={styles.cardAiSquare} />
              ))}
            </View>
          </View>
          <Text style={styles.cardTitle}>{workout.title.toUpperCase()}</Text>
          <Text style={styles.cardMeta} numberOfLines={1} ellipsizeMode="tail">
            {workout.description}
          </Text>
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
        <View style={styles.emptySavedStar}>
          <Ionicons name="star" size={scale(16)} color={theme.colors.teal} />
        </View>
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
  const { weekStreakDays, streak } = useWorkoutHistory();
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

        <StreakRail days={weekStreakDays} streakCount={streak} />

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
      streak,
      tabTopPadding,
      timeGreeting,
      weekStreakDays,
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

const DOT_SIZE = scale(7);
const TODAY_DOT_SIZE = scale(9);
const MOTIF_SIZE = scale(4);

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
    color: theme.colors.textMuted,
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
    borderTopWidth: scale(0.5),
    borderBottomWidth: scale(0.5),
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
  },
  streakRailColumns: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakColumn: {
    alignItems: 'center',
    gap: scale(6),
  },
  streakDayLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  streakDayLabelToday: {
    color: theme.colors.textPrimary,
  },
  streakSquare: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    minWidth: DOT_SIZE,
    minHeight: DOT_SIZE,
    borderRadius: 999,
    aspectRatio: 1,
    flexShrink: 0,
    alignSelf: 'center',
  },
  streakSquareCompleted: {
    backgroundColor: theme.colors.red,
  },
  streakSquareFuture: {
    backgroundColor: theme.colors.grey200,
  },
  streakSquareToday: {
    width: TODAY_DOT_SIZE,
    height: TODAY_DOT_SIZE,
    minWidth: TODAY_DOT_SIZE,
    minHeight: TODAY_DOT_SIZE,
    borderRadius: 999,
    aspectRatio: 1,
    flexShrink: 0,
    alignSelf: 'center',
    backgroundColor: theme.colors.red,
  },
  streakCountBlock: {
    marginRight: scale(16),
    alignItems: 'flex-start',
    justifyContent: 'center',
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
    color: theme.colors.textMuted,
    letterSpacing: scale(0.8),
    marginTop: scale(6),
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
  heroDifficultyRow: {
    position: 'absolute',
    top: scale(16),
    right: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    zIndex: 2,
  },
  heroDifficultySquare: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: theme.colors.teal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(36,33,33,0.25)',
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
    gap: scale(6),
  },
  heroTitle: {
    fontFamily: theme.fonts.header,
    fontSize: scale(26),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  heroMetaPrimary: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  heroDescription: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
    lineHeight: scale(15),
    color: 'rgba(255,255,255,0.65)',
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
  sectionRule: {
    borderBottomWidth: scale(0.5),
    borderBottomColor: theme.colors.border,
    marginTop: scale(6),
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
  filterTabActiveSaved: {
    borderBottomColor: theme.colors.teal,
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
    color: theme.colors.textMuted,
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
    right: scale(8),
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
    justifyContent: 'space-between',
  },
  cardDuration: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  cardAiSquare: {
    width: MOTIF_SIZE,
    height: MOTIF_SIZE,
    borderRadius: MOTIF_SIZE / 2,
    backgroundColor: theme.colors.teal,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
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
    letterSpacing: scale(0.2),
    color: theme.colors.textMuted,
    marginTop: scale(2),
  },
  emptySavedState: {
    paddingVertical: scale(32),
    paddingHorizontal: scale(8),
    alignItems: 'center',
  },
  emptySavedStar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(121, 203, 208, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
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
