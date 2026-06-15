import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getWorkoutById } from '../data/workouts';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ClassDetail'>;

const HORIZONTAL_PADDING = scale(20);
const HERO_HEIGHT_RATIO = 0.4;

function formatIntensity(intensity: string) {
  return intensity.charAt(0).toUpperCase() + intensity.slice(1);
}

function formatExerciseMeta(sets: number, reps: number) {
  return `${sets} sets · ${reps} reps`;
}

export default function ClassDetail({ route, navigation }: Props) {
  const { workoutId } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();
  const heroHeight = Dimensions.get('window').height * HERO_HEIGHT_RATIO;

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
    { label: 'Minutes', value: String(workout.duration), accent: false },
    {
      label: 'Intensity',
      value: formatIntensity(workout.intensity),
      accent: true,
    },
    {
      label: 'Exercises',
      value: String(workout.exercises.length),
      accent: false,
    },
    {
      label: '✦ AI Corrections',
      value: workout.aiTracked ? 'Yes' : 'No',
      accent: true,
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
          <View style={styles.heroPlaceholder} />
          <Pressable
            style={[styles.iconButton, { top: insets.top + scale(12), left: scale(20) }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.iconButtonText}>←</Text>
          </Pressable>
          <Pressable
            style={[styles.iconButton, { top: insets.top + scale(12), right: scale(20) }]}
          >
            <Text style={styles.iconButtonText}>☆</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{workout.title}</Text>
          <Text style={styles.description}>{workout.description}</Text>

          <View style={styles.tagRow}>
            {workout.tags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
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
                <Text
                  style={[
                    styles.statValue,
                    stat.accent && styles.statValueAccent,
                  ]}
                >
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
                <View style={styles.exerciseTitleRow}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.tracked ? (
                    <View style={styles.trackedBadge}>
                      <Text style={styles.trackedBadgeText}>+ Tracked</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.exerciseMeta}>
                  {formatExerciseMeta(exercise.sets, exercise.reps)}
                </Text>
              </View>
            </Pressable>
          ))}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <Pressable
        style={styles.beginButton}
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
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.surfaceMuted,
  },
  iconButton: {
    position: 'absolute',
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    color: theme.colors.white,
    fontSize: scale(18),
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: scale(20),
  },
  title: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.white,
    marginBottom: scale(8),
  },
  description: {
    ...theme.typography.body,
    color: `${theme.colors.white}99`,
    lineHeight: 20,
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
    borderColor: `${theme.colors.white}44`,
    borderRadius: theme.radius.full,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
  },
  tagPillText: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: scale(20),
  },
  statColumn: {
    flex: 1,
    paddingHorizontal: scale(6),
  },
  statColumnDivider: {
    borderLeftWidth: scale(1),
    borderLeftColor: `${theme.colors.white}22`,
  },
  statValue: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(18),
    color: theme.colors.white,
    marginBottom: scale(4),
  },
  statValueAccent: {
    color: theme.colors.red,
  },
  statLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: `${theme.colors.white}66`,
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
    color: `${theme.colors.white}66`,
  },
  exerciseThumbnail: {
    width: scale(40),
    height: scale(40),
    backgroundColor: `${theme.colors.white}22`,
    borderRadius: scale(4),
    marginRight: scale(12),
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(4),
  },
  exerciseName: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    color: theme.colors.white,
  },
  trackedBadge: {
    borderWidth: scale(1),
    borderColor: theme.colors.red,
    borderRadius: theme.radius.md,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
  },
  trackedBadgeText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.red,
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
    bottom: scale(24),
    right: scale(24),
    backgroundColor: theme.colors.red,
    paddingHorizontal: scale(28),
    paddingVertical: scale(14),
    borderRadius: theme.radius.full,
  },
  beginButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
