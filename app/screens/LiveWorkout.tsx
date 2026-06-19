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
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import DashedBorderOverlay from '../components/DashedBorderOverlay';
import LiveWorkoutNativeCamera from '../components/LiveWorkoutNativeCamera';
import { getWorkoutById } from '../data/workouts';
import {
  usePoseDetection,
  type DetectedPose,
  type FormAssessmentData,
  type PoseExercise,
  type SessionLogEntry,
} from '../hooks/usePoseDetection';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'LiveWorkout'>;

type ExerciseWindows = {
  exercise: PoseExercise;
  windows: Array<{ start: number; end: number }>;
};

const CORRECTION_WINDOWS: ExerciseWindows[] = [
  {
    exercise: 'hundred',
    windows: [
      { start: 40, end: 55 },
      { start: 71, end: 88 },
    ],
  },
  {
    exercise: 'long_stretch',
    windows: [
      { start: 149, end: 156 },
      { start: 161, end: 173 },
      { start: 176, end: 184 },
    ],
  },
  {
    exercise: 'footwork_toes',
    windows: [
      { start: 247, end: 266 },
      { start: 268, end: 280 },
    ],
  },
];

const EXERCISE_LABELS: Record<PoseExercise, string> = {
  hundred: 'The Hundred',
  long_stretch: 'Long Stretch',
  footwork_toes: 'Footwork (Toes)',
  none: 'Get Ready',
};

const CLIP_MAP: Record<string, number> = {
  '01': require('../../assets/audio/01.mp3'),
  '02': require('../../assets/audio/02.mp3'),
  '03': require('../../assets/audio/03.mp3'),
  '04': require('../../assets/audio/04.mp3'),
  '05': require('../../assets/audio/05.mp3'),
  '06': require('../../assets/audio/06.mp3'),
  '07': require('../../assets/audio/07.mp3'),
  '08': require('../../assets/audio/08.mp3'),
  '09': require('../../assets/audio/09.mp3'),
  '10': require('../../assets/audio/10.mp3'),
  '11': require('../../assets/audio/11.mp3'),
  '12': require('../../assets/audio/12.mp3'),
  '13': require('../../assets/audio/13.mp3'),
};

const SKELETON_DOT_COLOR = '#CC1D1D';
const SKELETON_LINE_COLOR = 'rgba(255, 255, 255, 0.45)';
const SKELETON_DRAW_THRESHOLD = 0.3;

const SKELETON_CONNECTIONS: [number, number][] = [
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 6],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

function formatTimer(seconds: number) {
  return (
    Math.floor(seconds / 60) +
    ':' +
    (seconds % 60).toString().padStart(2, '0')
  );
}

function getClipForError(errorKey: string): string {
  const map: Record<string, string> = {
    hip_pike: '05',
    hip_sag: '06',
    head_drop: '07',
    arms_sinking: '08',
    knee_cave: '09',
    heels_drop: '10',
    rushing: '11',
    hip_break: '12',
    momentum: '13',
  };
  return map[errorKey] ?? '01';
}

function drawSkeleton(
  poses: DetectedPose[],
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!poses.length) {
    return;
  }

  const keypoints = poses[0].keypoints;

  ctx.strokeStyle = SKELETON_LINE_COLOR;
  ctx.lineWidth = 2;
  SKELETON_CONNECTIONS.forEach(([i, j]) => {
    const a = keypoints[i];
    const b = keypoints[j];
    if (
      a &&
      b &&
      (a.score ?? 0) > SKELETON_DRAW_THRESHOLD &&
      (b.score ?? 0) > SKELETON_DRAW_THRESHOLD
    ) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  });

  keypoints.forEach((kp) => {
    if ((kp.score ?? 0) > SKELETON_DRAW_THRESHOLD) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = SKELETON_DOT_COLOR;
      ctx.fill();
    }
  });
}

const WorkoutTimer = memo(function WorkoutTimer({
  seconds,
}: {
  seconds: number;
}) {
  return <Text style={styles.timerText}>{formatTimer(seconds)}</Text>;
});

function LiveWorkout({ route, navigation }: Props) {
  const { workoutId } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();

  const [repCount] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentExercise, setCurrentExercise] = useState<PoseExercise>('none');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerSecondsRef = useRef(0);
  const currentExerciseRef = useRef<PoseExercise>('none');
  const baseTrackRef = useRef<Audio.Sound | null>(null);
  const clipPlaying = useRef(false);
  const hasNavigatedToPostWorkout = useRef(false);
  const formData = useRef<FormAssessmentData>({
    errorCount: {},
    frameCount: 0,
    goodFrames: 0,
  });
  const sessionLog = useRef<SessionLogEntry[]>([]);

  currentExerciseRef.current = currentExercise;

  useEffect(() => {
    formData.current = { errorCount: {}, frameCount: 0, goodFrames: 0 };
  }, [currentExercise]);

  const navigateToPostWorkout = useCallback(() => {
    if (!workoutId || hasNavigatedToPostWorkout.current) {
      return;
    }

    hasNavigatedToPostWorkout.current = true;
    navigation.navigate('PostWorkout', {
      workoutId,
      sessionLog: sessionLog.current,
    });
  }, [navigation, workoutId]);

  const queueClip = useCallback(
    async (
      clipNumber: string,
      meta: {
        exercise: string;
        type: SessionLogEntry['type'];
      }
    ) => {
      if (clipPlaying.current) {
        return;
      }

      clipPlaying.current = true;
      await baseTrackRef.current?.setVolumeAsync(0.25);

      const clipSource = CLIP_MAP[clipNumber];
      if (!clipSource) {
        clipPlaying.current = false;
        await baseTrackRef.current?.setVolumeAsync(1.0);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(clipSource);
      sessionLog.current.push({
        exercise: meta.exercise,
        clipPlayed: clipNumber,
        timestamp: timerSecondsRef.current,
        type: meta.type,
      });

      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded || !status.didJustFinish) {
          return;
        }

        void (async () => {
          await baseTrackRef.current?.setVolumeAsync(1.0);
          clipPlaying.current = false;
          await sound.unloadAsync();
        })();
      });
    },
    []
  );

  const onWindowOpen = useCallback(
    (exercise: string) => {
      const data = formData.current;
      const totalFrames = data.frameCount;

      if (totalFrames === 0) {
        void queueClip('01', { exercise, type: 'motivation' });
        formData.current = { errorCount: {}, frameCount: 0, goodFrames: 0 };
        return;
      }

      const goodRatio = data.goodFrames / totalFrames;
      const topError = Object.entries(data.errorCount).sort(
        ([, a], [, b]) => b - a
      )[0];
      const errorRatio = topError ? topError[1] / totalFrames : 0;

      if (errorRatio > 0.3) {
        void queueClip(getClipForError(topError![0]), {
          exercise,
          type: 'correction',
        });
      } else if (goodRatio > 0.7) {
        void queueClip(Math.random() > 0.5 ? '03' : '04', {
          exercise,
          type: 'positive',
        });
      } else {
        void queueClip(Math.random() > 0.5 ? '01' : '02', {
          exercise,
          type: 'motivation',
        });
      }

      formData.current = { errorCount: {}, frameCount: 0, goodFrames: 0 };
    },
    [queueClip]
  );

  useEffect(() => {
    async function loadAndPlayBaseTrack() {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/audio/basetrack.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      baseTrackRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          navigateToPostWorkout();
        }
      });
    }

    void loadAndPlayBaseTrack();

    return () => {
      void baseTrackRef.current?.unloadAsync();
    };
  }, [navigateToPostWorkout]);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = timerSecondsRef.current + 1;
      timerSecondsRef.current = t;
      setTimerSeconds(t);

      if (t === 5) {
        setCurrentExercise('hundred');
      }
      if (t === 130) {
        setCurrentExercise('long_stretch');
      }
      if (t === 220) {
        setCurrentExercise('footwork_toes');
      }

      CORRECTION_WINDOWS.forEach(({ exercise, windows }) => {
        windows.forEach((window) => {
          if (t === window.start && currentExerciseRef.current === exercise) {
            onWindowOpen(exercise);
          }
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onWindowOpen]);

  const handleBack = useCallback(() => {
    void baseTrackRef.current?.unloadAsync();
    navigation.goBack();
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
        video: { facingMode: 'user' },
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

  const setCanvasNode = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
  }, []);

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

  const { poses } = usePoseDetection(
    videoRef,
    Platform.OS === 'web' ? currentExercise : 'none',
    formData
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    if (canvasRef.current && videoRef.current) {
      drawSkeleton(poses, canvasRef.current, videoRef.current);
    }
  }, [poses]);

  if (!workout) {
    return (
      <View style={styles.container}>
        <Pressable
          style={[
            styles.pillButton,
            styles.backButton,
            { top: insets.top + scale(12) },
          ]}
          onPress={handleBack}
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
          <>
            {createElement('video', {
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
            })}
            {createElement('canvas', {
              key: 'skeleton-overlay',
              ref: setCanvasNode,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
              },
            })}
          </>
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
            onPress={handleBack}
          >
            <Text style={styles.pillButtonText}>←</Text>
          </Pressable>

          <View style={[styles.pillButton, styles.timerPill]}>
            <WorkoutTimer seconds={timerSeconds} />
          </View>

          <Pressable style={[styles.pillButton, styles.volumeButton]}>
            <Text style={styles.pillButtonText}>🔊</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.bottomPanelMain}>
          <Text style={styles.exerciseName}>
            {EXERCISE_LABELS[currentExercise]}
          </Text>
          <Text style={styles.currentExerciseLabel}>CURRENT EXERCISE</Text>

          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statText}>{workout.duration} min</Text>
            </View>
            <View style={[styles.statColumn, styles.statColumnDivider]}>
              <Text style={styles.statText}>
                {workout.intensity.charAt(0).toUpperCase() +
                  workout.intensity.slice(1)}
              </Text>
            </View>
            <View style={[styles.statColumn, styles.statColumnDivider]}>
              <Text style={styles.statText}>AI Tracked</Text>
            </View>
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
