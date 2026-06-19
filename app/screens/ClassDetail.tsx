import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getWorkoutById, type Intensity } from '../data/workouts';
import {
  DEMO_WORKOUT_ID,
  getLibraryWorkoutForDemo,
} from '../data/workoutLibrary';
import { useSavedWorkouts } from '../context/SavedWorkoutsContext';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ClassDetail'>;

const HORIZONTAL_PADDING = scale(20);
const HERO_HEIGHT_RATIO = 0.4;

function formatIntensity(intensity: Intensity) {
  return intensity.charAt(0).toUpperCase() + intensity.slice(1);
}

function formatExerciseMeta(
  sets: number,
  reps: number,
  meta?: string
) {
  if (meta) {
    return meta;
  }
  if (sets === 1 && reps >= 50) {
    return `${sets} set · ${reps} counts`;
  }
  return `${sets} sets · ${reps} reps`;
}

function getIntensityColor(intensity: Intensity) {
  return intensity === 'high' ? theme.colors.red : theme.colors.white;
}

export default function ClassDetail({ route, navigation }: Props) {
  const { libraryId, workoutId: routeWorkoutId } = route.params ?? {};
  const libraryWorkout = getLibraryWorkoutForDemo(libraryId, routeWorkoutId);
  const workout = getWorkoutById(
    libraryWorkout?.workoutId ?? routeWorkoutId ?? DEMO_WORKOUT_ID
  );
  const { isSaved, toggleSaved } = useSavedWorkouts();
  const insets = useSafeAreaInsets();
  const heroHeight = Dimensions.get('window').height * HERO_HEIGHT_RATIO;
  const bookmarkId = libraryWorkout?.id ?? routeWorkoutId;
  const saved = bookmarkId ? isSaved(bookmarkId) : false;
  const displayTitle = libraryWorkout?.title ?? workout?.title;

  if (!workout) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.iconButton, { top: insets.top + scale(12), left: scale(20) }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.iconButtonText}>←</Text>
        </Pressable>
        <Text style={styles.notFound}>Workout not found</Text>
      </View>
    );
  }

  const stats = [
    {
      value: String(workout.duration),
      label: 'Minutes',
      color: theme.colors.white,
    },
    {
      value: formatIntensity(workout.intensity),
      label: 'Intensity',
      color: getIntensityColor(workout.intensity),
    },
    {
      value: String(workout.exercises.length),
      label: 'Exercises',
      color: theme.colors.white,
    },
    {
      value: workout.aiTracked ? '✦ AI' : 'No',
      label: 'Corrections',
      color: workout.aiTracked ? theme.colors.teal : theme.colors.white,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          {libraryWorkout ? (
            <Image
              source={libraryWorkout.coverImage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder} />
          )}
          <View
            style={[
              styles.heroGradient,
              Platform.OS === 'web'
                ? ({
                    backgroundImage:
                      'linear-gradient(to bottom, rgba(36,33,33,0) 0%, rgba(36,33,33,0.55) 55%, #242121 100%)',
                  } as object)
                : null,
            ]}
          />
          <Pressable
            style={[styles.iconButton, { top: insets.top + scale(12), left: scale(20) }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.iconButtonText}>←</Text>
          </Pressable>
          <Pressable
            style={[
              styles.iconButton,
              saved && styles.iconButtonSaved,
              { top: insets.top + scale(12), right: scale(20) },
            ]}
            onPress={() => {
              if (bookmarkId) {
                toggleSaved(bookmarkId);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark workout'}
          >
            <Text
              style={[
                styles.iconButtonText,
                saved && styles.iconButtonTextSaved,
              ]}
            >
              {saved ? '★' : '☆'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.description}>{workout.description}</Text>

          <View style={styles.tagRow}>
            {workout.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.statsRow}>
            {stats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.statColumn,
                  index > 0 && styles.statColumnDivider,
                ]}
              >
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>CLASS BREAKDOWN</Text>

          {workout.exercises.map((exercise, index) => (
            <Pressable
              key={`${exercise.name}-${index}`}
              style={[
                styles.exerciseRow,
                index < workout.exercises.length - 1 &&
                  styles.exerciseRowBorder,
              ]}
              onPress={() =>
                navigation.navigate('ExercisePreview', {
                  workoutId: workout.id,
                  exerciseIndex: index,
                })
              }
            >
              <Text style={styles.exerciseNumber}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={styles.exerciseThumbnail} />
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {formatExerciseMeta(
                    exercise.sets,
                    exercise.reps,
                    exercise.meta
                  )}
                </Text>
              </View>
              {exercise.tracked ? (
                <View style={styles.trackedBadge}>
                  <Text style={styles.trackedBadgeText}>✦ Tracked</Text>
                </View>
              ) : null}
            </Pressable>
          ))}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <Pressable
        style={[styles.beginButton, { bottom: insets.bottom + scale(24) }]}
        onPress={() =>
          navigation.navigate('LiveWorkout', { workoutId: workout.id })
        }
      >
        <Text style={styles.beginButtonText}>BEGIN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(100),
  },
  hero: {
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.surfaceMuted,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36, 33, 33, 0.35)',
  },
  iconButton: {
    position: 'absolute',
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconButtonText: {
    color: theme.colors.white,
    fontSize: scale(18),
  },
  iconButtonSaved: {
    backgroundColor: 'rgba(121, 203, 208, 0.25)',
  },
  iconButtonTextSaved: {
    color: theme.colors.teal,
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: scale(20),
  },
  title: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    fontSize: scale(28),
    color: theme.colors.white,
    marginBottom: scale(8),
  },
  description: {
    ...theme.typography.body,
    fontSize: scale(14),
    color: `${theme.colors.white}99`,
    lineHeight: scale(20),
    marginBottom: scale(16),
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(20),
  },
  tagPill: {
    borderWidth: scale(1),
    borderColor: `${theme.colors.white}55`,
    borderRadius: theme.radius.full,
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
  },
  tagPillText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    color: theme.colors.white,
    letterSpacing: scale(0.6),
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: scale(20),
  },
  statColumn: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: scale(4),
  },
  statColumnDivider: {
    borderLeftWidth: scale(1),
    borderLeftColor: `${theme.colors.white}22`,
    paddingLeft: scale(10),
  },
  statValue: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(20),
    marginBottom: scale(4),
  },
  statLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: `${theme.colors.white}66`,
    letterSpacing: scale(0.4),
    textTransform: 'none',
  },
  sectionDivider: {
    height: scale(1),
    backgroundColor: `${theme.colors.white}22`,
    marginBottom: scale(12),
  },
  sectionLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: `${theme.colors.white}66`,
    marginBottom: scale(12),
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
  },
  exerciseRowBorder: {
    borderBottomWidth: scale(1),
    borderBottomColor: `${theme.colors.white}0a`,
  },
  exerciseNumber: {
    width: scale(28),
    ...theme.typography.body,
    fontSize: scale(14),
    color: `${theme.colors.white}66`,
  },
  exerciseThumbnail: {
    width: scale(44),
    height: scale(44),
    backgroundColor: `${theme.colors.white}18`,
    borderRadius: scale(6),
    marginRight: scale(12),
  },
  exerciseInfo: {
    flex: 1,
    paddingRight: scale(8),
  },
  exerciseName: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    color: theme.colors.white,
    marginBottom: scale(4),
  },
  trackedBadge: {
    borderWidth: scale(1),
    borderColor: theme.colors.teal,
    borderRadius: theme.radius.md,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    alignSelf: 'center',
  },
  trackedBadgeText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.teal,
    letterSpacing: scale(0.3),
    textTransform: 'none',
  },
  exerciseMeta: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: `${theme.colors.white}66`,
  },
  bottomSpacer: {
    height: scale(24),
  },
  beginButton: {
    position: 'absolute',
    right: scale(24),
    backgroundColor: theme.colors.red,
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    borderRadius: theme.radius.full,
    zIndex: 5,
  },
  beginButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(12),
    color: theme.colors.white,
    letterSpacing: scale(0.8),
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
