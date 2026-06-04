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

type Props = NativeStackScreenProps<AppStackParamList, 'ClassDetail'>;

const HORIZONTAL_PADDING = 20;
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
          style={[styles.iconButton, { top: insets.top + 12, left: 20 }]}
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
            style={[styles.iconButton, { top: insets.top + 12, left: 20 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.iconButtonText}>←</Text>
          </Pressable>
          <Pressable
            style={[styles.iconButton, { top: insets.top + 12, right: 20 }]}
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
    backgroundColor: '#1a1a1a',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    width: '100%',
    position: 'relative',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: '#333333',
  },
  iconButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#ffffff99',
    lineHeight: 20,
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: '#ffffff44',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagPillText: {
    color: '#ffffff',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statColumn: {
    flex: 1,
    paddingHorizontal: 6,
  },
  statColumnDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#ffffff22',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  statValueAccent: {
    color: '#cc2200',
  },
  statLabel: {
    fontSize: 11,
    color: '#ffffff66',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#ffffff22',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#ffffff66',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  exerciseRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff0a',
  },
  exerciseNumber: {
    width: 28,
    fontSize: 14,
    color: '#ffffff66',
  },
  exerciseThumbnail: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff22',
    borderRadius: 4,
    marginRight: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  exerciseName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  trackedBadge: {
    borderWidth: 1,
    borderColor: '#cc2200',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trackedBadgeText: {
    fontSize: 10,
    color: '#cc2200',
  },
  exerciseMeta: {
    fontSize: 12,
    color: '#ffffff66',
  },
  bottomSpacer: {
    height: 24,
  },
  beginButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#cc2200',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  beginButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  notFound: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
});
