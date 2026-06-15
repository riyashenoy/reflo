import {
  createElement,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DashedBorderOverlay from '../components/DashedBorderOverlay';
import LiveWorkoutNativeCamera from '../components/LiveWorkoutNativeCamera';
import { getWorkoutById } from '../data/workouts';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'LiveWorkout'>;

function formatTimer(seconds: number) {
  return (
    Math.floor(seconds / 60) +
    ':' +
    (seconds % 60).toString().padStart(2, '0')
  );
}

const WorkoutTimer = memo(function WorkoutTimer({
  onReachThirty,
}: {
  onReachThirty: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (next === 30) {
          onReachThirty();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onReachThirty]);

  return <Text style={styles.timerText}>{formatTimer(seconds)}</Text>;
});

function LiveWorkout({ route, navigation }: Props) {
  const { workoutId } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();

  const [currentExerciseIndex] = useState(0);
  const [repCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workoutIdRef = useRef(workoutId);
  const hasNavigatedToPostWorkout = useRef(false);

  workoutIdRef.current = workoutId;

  const handleTimerReachThirty = useCallback(() => {
    if (!workoutIdRef.current || hasNavigatedToPostWorkout.current) {
      return;
    }

    hasNavigatedToPostWorkout.current = true;
    navigation.navigate('PostWorkout', {
      workoutId: workoutIdRef.current,
    });
  }, [navigation]);

  const attachStreamToVideo = useCallback((video: HTMLVideoElement) => {
    if (!video.srcObject && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play();
    }
  }, []);

  const startCamera = useCallback(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment' },
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current && !videoRef.current.srcObject) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch((err) => console.log('Camera error:', err));
  }, []);

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;

      if (node) {
        attachStreamToVideo(node);
      }
    },
    [attachStreamToVideo]
  );

  useEffect(() => {
    startCamera();

    return () => {
      const tracks = streamRef.current?.getTracks() ?? [];
      tracks.forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [startCamera]);

  const exercise = workout?.exercises[currentExerciseIndex];

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
          style={[
            styles.pillButton,
            styles.backButton,
            { top: insets.top + scale(12) },
          ]}
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
        {Platform.OS === 'web' ? (
          createElement('video', {
            key: 'camera-feed',
            ref: setVideoNode,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
            autoPlay: true,
            playsInline: true,
            muted: true,
          })
        ) : (
          <LiveWorkoutNativeCamera />
        )}

        <DashedBorderOverlay />

        <View
          style={[styles.topBar, { paddingTop: insets.top + scale(8) }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={[styles.pillButton, styles.backButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.pillButtonText}>←</Text>
          </Pressable>

          <View style={[styles.pillButton, styles.timerPill]}>
            <WorkoutTimer onReachThirty={handleTimerReachThirty} />
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

export default memo(LiveWorkout);

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
    paddingHorizontal: scale(16),
    paddingBottom: scale(8),
    zIndex: 3,
  },
  pillButton: {
    backgroundColor: '#00000066',
    borderRadius: theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: scale(40),
    height: scale(40),
    paddingHorizontal: scale(12),
  },
  backButton: {
    width: scale(40),
  },
  timerPill: {
    minWidth: scale(72),
  },
  volumeButton: {
    width: scale(40),
  },
  pillButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontSize: scale(16),
  },
  timerText: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.white,
    fontSize: scale(16),
  },
  bottomPanel: {
    backgroundColor: theme.colors.workoutBg,
    padding: scale(20),
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bottomPanelMain: {
    flex: 1,
    paddingRight: scale(16),
  },
  exerciseName: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    color: theme.colors.white,
    marginBottom: scale(4),
  },
  currentExerciseLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: `${theme.colors.white}66`,
    marginBottom: scale(12),
  },
  statsRow: {
    flexDirection: 'row',
  },
  statColumn: {
    paddingHorizontal: scale(8),
  },
  statColumnDivider: {
    borderLeftWidth: scale(1),
    borderLeftColor: `${theme.colors.white}33`,
  },
  statText: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
  repCounter: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: theme.colors.dark,
    borderWidth: scale(1),
    borderColor: `${theme.colors.white}22`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repCounterText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(20),
    color: theme.colors.white,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
