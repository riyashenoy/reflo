import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CameraPreview from '../components/CameraPreview';
import DashedBorderOverlay from '../components/DashedBorderOverlay';
import { getWorkoutById } from '../data/workouts';
import type { AppStackParamList } from '../navigation';
import theme from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'LiveWorkout'>;

function formatTimer(seconds: number) {
  return (
    Math.floor(seconds / 60) +
    ':' +
    (seconds % 60).toString().padStart(2, '0')
  );
}

export default function LiveWorkout({ route, navigation }: Props) {
  const { workoutId } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [repCount] = useState(0);

  const exercise = workout?.exercises[currentExerciseIndex];
  const hasNavigatedToPostWorkout = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (
      seconds >= 30 &&
      workoutId &&
      !hasNavigatedToPostWorkout.current
    ) {
      hasNavigatedToPostWorkout.current = true;
      setSeconds(0);
      navigation.navigate('PostWorkout', { workoutId });
    }
  }, [seconds, workoutId, navigation]);

  const stats = exercise
    ? [
        { label: 'Reps', value: String(exercise.reps) },
        { label: 'Sets', value: String(exercise.sets) },
        { label: 'Spring', value: 'Light' },
      ]
    : [];

  if (!workout || !exercise) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.pillButton, styles.backButton, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.pillButtonText}>←</Text>
        </Pressable>
        <Text style={styles.notFound}>Workout not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraSection}>
        <CameraPreview />

        <DashedBorderOverlay />

        <View
          style={[styles.topBar, { paddingTop: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={[styles.pillButton, styles.backButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.pillButtonText}>←</Text>
          </Pressable>

          <View style={[styles.pillButton, styles.timerPill]}>
            <Text style={styles.timerText}>{formatTimer(seconds)}</Text>
          </View>

          <Pressable style={[styles.pillButton, styles.volumeButton]}>
            <Text style={styles.pillButtonText}>🔊</Text>
          </Pressable>
        </View>

      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.bottomPanelMain}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.currentExerciseLabel}>CURRENT EXERCISE</Text>

          <View style={styles.statsRow}>
            {stats.map((stat, index) => (
              <View
                key={stat.label}
                style={[
                  styles.statColumn,
                  index > 0 && styles.statColumnDivider,
                ]}
              >
                <Text style={styles.statText}>
                  {stat.value} {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.repCounter}>
          <Text style={styles.repCounterText}>{repCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.workoutBg,
  },
  cameraSection: {
    flex: 1,
    backgroundColor: theme.colors.dark,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 3,
  },
  pillButton: {
    backgroundColor: '#00000066',
    borderRadius: theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    height: 40,
    paddingHorizontal: 12,
  },
  backButton: {
    width: 40,
  },
  timerPill: {
    minWidth: 72,
  },
  volumeButton: {
    width: 40,
  },
  pillButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontSize: 16,
  },
  timerText: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.white,
    fontSize: 16,
  },
  bottomPanel: {
    backgroundColor: theme.colors.workoutBg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bottomPanelMain: {
    flex: 1,
    paddingRight: 16,
  },
  exerciseName: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    fontSize: 26,
    color: theme.colors.white,
    marginBottom: 4,
  },
  currentExerciseLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: `${theme.colors.white}66`,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statColumn: {
    paddingHorizontal: 8,
  },
  statColumnDivider: {
    borderLeftWidth: 1,
    borderLeftColor: `${theme.colors.white}33`,
  },
  statText: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
  repCounter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.dark,
    borderWidth: 1,
    borderColor: `${theme.colors.white}22`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repCounterText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 20,
    color: theme.colors.white,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: 100,
  },
});
