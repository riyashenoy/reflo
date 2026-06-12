import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
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
import theme from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ExercisePreview'>;

const SWIPE_THRESHOLD = 50;

function getExerciseSteps(cue: string) {
  const sentences = cue
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return [{ label: 'Step 1', description: cue }];
  }

  return sentences.map((sentence, index) => ({
    label: `Step ${index + 1}`,
    description: sentence,
  }));
}

export default function ExercisePreview({ route, navigation }: Props) {
  const { workoutId, exerciseIndex = 0 } = route.params;
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();

  const exercises = workout?.exercises ?? [];
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(exerciseIndex, 0), Math.max(exercises.length - 1, 0))
  );

  const exercise = exercises[currentIndex];
  const totalExercises = exercises.length;
  const isLastExercise = currentIndex >= totalExercises - 1;

  const steps = useMemo(
    () => (exercise ? getExerciseSteps(exercise.cue) : []),
    [exercise]
  );

  const exerciseCountRef = useRef(totalExercises);
  exerciseCountRef.current = totalExercises;

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToNext = () => {
    setCurrentIndex((prev) =>
      Math.min(prev + 1, exerciseCountRef.current - 1)
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -SWIPE_THRESHOLD) {
            setCurrentIndex((prev) =>
              Math.min(prev + 1, exerciseCountRef.current - 1)
            );
          } else if (gestureState.dx > SWIPE_THRESHOLD) {
            setCurrentIndex((prev) => Math.max(prev - 1, 0));
          }
        },
      }),
    []
  );

  if (!workout || !exercise) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.notFound}>Exercise not found</Text>
      </View>
    );
  }

  const stats = [
    { label: 'Reps', value: String(exercise.reps) },
    { label: 'Sets', value: String(exercise.sets) },
    { label: 'Spring', value: 'Light' },
  ];

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Pressable
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </Pressable>

      <Pressable style={styles.tapZoneLeft} onPress={goToPrevious} />
      <Pressable style={styles.tapZoneRight} onPress={goToNext} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videoArea}>
          <View style={styles.videoPlaceholder}>
            <View style={styles.playButton}>
              <Text style={styles.playButtonIcon}>▶</Text>
            </View>
          </View>
        </View>

        <View style={styles.dotsRow}>
          {exercises.map((_, index) => (
            <Pressable key={index} onPress={() => setCurrentIndex(index)}>
              <View
                style={[
                  styles.dot,
                  index === currentIndex
                    ? styles.dotActive
                    : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.content}>
          <Text style={styles.exerciseCount}>
            EXERCISE {currentIndex + 1} OF {totalExercises}
          </Text>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDescription}>{exercise.cue}</Text>

          <View style={styles.statsRow}>
            {stats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.statColumn,
                  index > 0 && styles.statColumnDivider,
                ]}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {steps.map((step) => (
            <View key={step.label} style={styles.stepCard}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          ))}

          {isLastExercise ? (
            <Pressable
              style={styles.beginClassButton}
              onPress={() =>
                navigation.navigate('LiveWorkout', { workoutId: workout.id })
              }
            >
              <Text style={styles.beginClassButtonText}>Begin class</Text>
            </Pressable>
          ) : null}

          <View style={styles.navArrows}>
            <Pressable
              style={[
                styles.arrowButton,
                currentIndex === 0 && styles.arrowButtonDisabled,
              ]}
              onPress={goToPrevious}
              disabled={currentIndex === 0}
            >
              <Text style={styles.arrowButtonText}>‹ Prev</Text>
            </Pressable>
            <Pressable
              style={[
                styles.arrowButton,
                isLastExercise && styles.arrowButtonDisabled,
              ]}
              onPress={goToNext}
              disabled={isLastExercise}
            >
              <Text style={styles.arrowButtonText}>Next ›</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  tapZoneLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 1,
  },
  tapZoneRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '30%',
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: 18,
  },
  videoArea: {
    paddingTop: 56,
  },
  videoPlaceholder: {
    height: 280,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    color: theme.colors.white,
    fontSize: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: `${theme.colors.white}44`,
  },
  content: {
    paddingHorizontal: 20,
  },
  exerciseCount: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: `${theme.colors.white}66`,
    marginBottom: 8,
  },
  exerciseName: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    fontSize: 28,
    color: theme.colors.white,
    marginBottom: 8,
  },
  exerciseDescription: {
    ...theme.typography.body,
    color: `${theme.colors.white}99`,
    lineHeight: 20,
    marginBottom: 20,
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
    borderLeftColor: `${theme.colors.white}22`,
  },
  statValue: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 18,
    color: theme.colors.white,
    marginBottom: 4,
  },
  statLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: `${theme.colors.white}66`,
  },
  stepCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    padding: 16,
    marginBottom: 12,
  },
  stepLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: 10,
    color: `${theme.colors.white}99`,
    marginBottom: 6,
  },
  stepDescription: {
    ...theme.typography.body,
    color: theme.colors.white,
    lineHeight: 20,
  },
  beginClassButton: {
    backgroundColor: theme.colors.red,
    borderRadius: theme.radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  beginClassButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  navArrows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  arrowButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  arrowButtonDisabled: {
    opacity: 0.35,
  },
  arrowButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: 100,
  },
});
