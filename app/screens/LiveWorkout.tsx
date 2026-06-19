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
import Svg, { Circle } from 'react-native-svg';

import DashedBorderOverlay from '../components/DashedBorderOverlay';
import LiveWorkoutNativeCamera from '../components/LiveWorkoutNativeCamera';
import { getWorkoutById } from '../data/workouts';
import {
  configureWorkoutAudioMode,
  preloadClipSounds,
  unloadClipSounds,
} from '../lib/workoutAudio';
import {
  usePoseDetection,
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

const BORDER_INSET = scale(12);

function formatTimer(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return (
    Math.floor(total / 60) +
    ':' +
    (total % 60).toString().padStart(2, '0')
  );
}

function getTrackDurationSeconds(
  workout: NonNullable<ReturnType<typeof getWorkoutById>>
) {
  return workout.audioDurationSeconds ?? workout.duration * 60;
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

const WorkoutTimer = memo(function WorkoutTimer({
  seconds,
}: {
  seconds: number;
}) {
  return <Text style={styles.timerText}>{formatTimer(seconds)}</Text>;
});

const PROGRESS_RADIUS = 20;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;

const ExerciseProgressCircle = memo(function ExerciseProgressCircle({
  currentExercise,
}: {
  currentExercise: PoseExercise;
}) {
  const exerciseNumber =
    currentExercise === 'hundred'
      ? 1
      : currentExercise === 'long_stretch'
        ? 2
        : currentExercise === 'footwork_toes'
          ? 3
          : 0;
  const progress = exerciseNumber / 3;
  const strokeDashoffset = PROGRESS_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.progressCircle}>
      <Svg width={52} height={52} style={styles.progressSvg}>
        <Circle
          cx={26}
          cy={26}
          r={PROGRESS_RADIUS}
          fill="none"
          stroke="#ffffff22"
          strokeWidth={3}
        />
        <Circle
          cx={26}
          cy={26}
          r={PROGRESS_RADIUS}
          fill="none"
          stroke="#CC1D1D"
          strokeWidth={3}
          strokeDasharray={PROGRESS_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
      </Svg>
      <Text style={styles.progressNumber}>{exerciseNumber || '–'}</Text>
    </View>
  );
});

function LiveWorkout({ route, navigation }: Props) {
  const { workoutId } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentExercise, setCurrentExercise] = useState<PoseExercise>('none');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [workoutStarted, setWorkoutStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerSecondsRef = useRef(0);
  const currentExerciseRef = useRef<PoseExercise>('none');
  const baseTrackRef = useRef<Audio.Sound | null>(null);
  const clipSoundsRef = useRef<Record<string, Audio.Sound>>({});
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
      let clipSound: Audio.Sound | null = null;

      try {
        await configureWorkoutAudioMode();
        await baseTrackRef.current?.setVolumeAsync(0.25);

        clipSound = clipSoundsRef.current[clipNumber];
        if (!clipSound) {
          const clipSource = CLIP_MAP[clipNumber];
          if (!clipSource) {
            return;
          }

          const { sound } = await Audio.Sound.createAsync(clipSource, {
            shouldPlay: false,
            volume: 1.0,
          });
          clipSoundsRef.current[clipNumber] = sound;
          clipSound = sound;
        }

        sessionLog.current.push({
          exercise: meta.exercise,
          clipPlayed: clipNumber,
          timestamp: timerSecondsRef.current,
          type: meta.type,
        });

        await clipSound.setPositionAsync(0);
        await new Promise<void>((resolve) => {
          const resetPlayback = () => {
            void (async () => {
              await baseTrackRef.current?.setVolumeAsync(1.0);
              clipPlaying.current = false;
            })();
            resolve();
          };

          const timeout = setTimeout(resetPlayback, 12000);

          clipSound!.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (!status.isLoaded || !status.didJustFinish) {
              return;
            }

            clearTimeout(timeout);
            resetPlayback();
          });

          void clipSound!.playAsync();
        });
      } catch {
        clipPlaying.current = false;
        await baseTrackRef.current?.setVolumeAsync(1.0);
      }
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

  const loadAndPlayBaseTrack = useCallback(async () => {
    await configureWorkoutAudioMode();

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/audio/basetrack.mp3'),
      { shouldPlay: true, volume: 1.0 }
    );
    baseTrackRef.current = sound;

    clipSoundsRef.current = await preloadClipSounds(CLIP_MAP);

    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        navigateToPostWorkout();
      }
    });
  }, [navigateToPostWorkout]);

  const handleReady = useCallback(() => {
    setShowOnboarding(false);
    setWorkoutStarted(true);
    void loadAndPlayBaseTrack();
  }, [loadAndPlayBaseTrack]);

  const skipToEnd = useCallback(async () => {
    if (!workout) {
      return;
    }

    const trackDuration = getTrackDurationSeconds(workout);
    const skipSeconds = Math.floor(trackDuration - 15.22);

    if (!workoutStarted) {
      setShowOnboarding(false);
      setWorkoutStarted(true);
      await loadAndPlayBaseTrack();
    }

    await baseTrackRef.current?.setPositionAsync(skipSeconds * 1000);
    timerSecondsRef.current = skipSeconds;
    setTimerSeconds(skipSeconds);
    setCurrentExercise('footwork_toes');
  }, [workout, workoutStarted, loadAndPlayBaseTrack]);

  useEffect(() => {
    return () => {
      void baseTrackRef.current?.unloadAsync();
      void unloadClipSounds(clipSoundsRef.current);
      clipSoundsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!workoutStarted || Platform.OS === 'web') {
      return;
    }

    const timeout = setTimeout(() => {
      void configureWorkoutAudioMode();
    }, 600);

    return () => clearTimeout(timeout);
  }, [workoutStarted]);

  useEffect(() => {
    if (!workoutStarted) {
      return;
    }

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
  }, [workoutStarted, onWindowOpen]);

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
    if (!workoutStarted) {
      return;
    }

    startCamera();

    return () => {
      const tracks = streamRef.current?.getTracks() ?? [];
      tracks.forEach((track) => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [workoutStarted, startCamera]);

  usePoseDetection(
    videoRef,
    canvasRef,
    Platform.OS === 'web' ? currentExercise : 'none',
    formData,
    workoutStarted
  );

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

  const trackDurationSeconds = getTrackDurationSeconds(workout);
  const remainingSeconds = Math.max(
    0,
    Math.floor(trackDurationSeconds - timerSeconds)
  );

  return (
    <View style={styles.container}>
      <View style={styles.cameraSection}>
        {workoutStarted ? (
          Platform.OS === 'web' ? (
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
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  zIndex: 2,
                },
              })}
            </>
          ) : (
            <LiveWorkoutNativeCamera />
          )
        ) : (
          <View style={styles.cameraPlaceholder} />
        )}

        <DashedBorderOverlay />

        <Pressable
          style={styles.skipButtonFloating}
          onPress={() => void skipToEnd()}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </Pressable>

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
            <WorkoutTimer seconds={remainingSeconds} />
          </View>

          <View style={styles.topBarSpacer} />
        </View>

        {showOnboarding ? (
          <View style={styles.onboardingOverlay}>
            <View style={styles.onboardingCard}>
              <View style={styles.onboardingGifPlaceholder}>
                <Text style={styles.onboardingGifLabel}>
                  Place your device where your full body is visible from the side
                </Text>
              </View>
              <Text style={styles.onboardingHint}>
                AI corrections will be announced with a ding so you know when to
                listen
              </Text>
              <Pressable style={styles.readyButton} onPress={handleReady}>
                <Text style={styles.readyButtonText}>I&apos;m Ready</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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

        <ExerciseProgressCircle currentExercise={currentExercise} />
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
  topBarSpacer: {
    width: scale(40),
  },
  skipButtonFloating: {
    position: 'absolute',
    bottom: BORDER_INSET + scale(16),
    right: BORDER_INSET + scale(16),
    backgroundColor: '#00000066',
    borderRadius: theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    height: scale(32),
    paddingHorizontal: scale(12),
    zIndex: 11,
  },
  skipButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontSize: scale(12),
    fontFamily: theme.fonts.bodyMedium,
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.dark,
  },
  progressCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: theme.colors.dark,
    borderWidth: scale(1),
    borderColor: `${theme.colors.white}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  progressNumber: {
    color: theme.colors.white,
    fontSize: scale(16),
    fontFamily: theme.fonts.bodyMedium,
    fontWeight: '500',
  },
  onboardingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000cc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    zIndex: 10,
  },
  onboardingCard: {
    width: '100%',
    maxWidth: scale(360),
    backgroundColor: '#1a1a1a',
    borderRadius: scale(20),
    padding: scale(28),
    alignItems: 'center',
  },
  onboardingGifPlaceholder: {
    width: scale(280),
    height: scale(200),
    borderRadius: scale(12),
    backgroundColor: theme.colors.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
    marginBottom: scale(20),
  },
  onboardingGifLabel: {
    ...theme.typography.body,
    color: theme.colors.dark,
    fontSize: scale(14),
    textAlign: 'center',
    lineHeight: scale(20),
  },
  onboardingHint: {
    ...theme.typography.body,
    color: `${theme.colors.white}99`,
    fontSize: scale(13),
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(24),
  },
  readyButton: {
    width: '100%',
    backgroundColor: '#CC1D1D',
    borderRadius: 999,
    paddingVertical: scale(16),
    alignItems: 'center',
  },
  readyButtonText: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.white,
    fontSize: scale(16),
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
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
