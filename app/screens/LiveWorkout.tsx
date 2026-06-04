import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DashedBorderOverlay from '../components/DashedBorderOverlay';
import { getWorkoutById } from '../data/workouts';
import type { AppStackParamList } from '../navigation';

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

  const [permission, requestPermission] = useCameraPermissions();

  const exercise = workout?.exercises[currentExerciseIndex];

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

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

  const renderCameraContent = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
          <Text style={styles.permissionText}>
            Camera preview is available on iOS and Android.
          </Text>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]}>
          <Text style={styles.permissionText}>Checking camera permission…</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[StyleSheet.absoluteFill, styles.permissionContainer]}>
          <Text style={styles.permissionText}>
            Camera access is required for live workouts.
          </Text>
          <Button
            title="Open Settings"
            onPress={() => Linking.openSettings()}
          />
          {!permission.canAskAgain ? null : (
            <View style={styles.permissionButtonSpacer}>
              <Button title="Grant Permission" onPress={requestPermission} />
            </View>
          )}
        </View>
      );
    }

    return <CameraView style={StyleSheet.absoluteFill} facing="back" />;
  };

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
        {renderCameraContent()}

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
    backgroundColor: '#0e0e0e',
  },
  cameraSection: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionContainer: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionButtonSpacer: {
    marginTop: 12,
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
    borderRadius: 20,
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
    color: '#ffffff',
    fontSize: 16,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPanel: {
    backgroundColor: '#0e0e0e',
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
    fontFamily: 'Georgia',
    fontSize: 26,
    color: '#ffffff',
    marginBottom: 4,
  },
  currentExerciseLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#ffffff66',
    textTransform: 'uppercase',
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
    borderLeftColor: '#ffffff33',
  },
  statText: {
    color: '#ffffff',
    fontSize: 14,
  },
  repCounter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#ffffff22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  repCounterText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  notFound: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
});
