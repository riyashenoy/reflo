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
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import LiveWorkoutNativeCamera from '../components/LiveWorkoutNativeCamera';
import { FadeSlideOverlay, PressableScale } from '../components/motion';
import {
  ExerciseProgressRingFromExercise,
  getWorkoutMainContentPadding,
  WORKOUT_TOP_BAR_TOP,
  WorkoutBackButton,
  WorkoutTopBar,
  WorkoutVideoFrame,
  workoutBottomPanelStyles,
} from '../components/workout/WorkoutChrome';
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

function LiveWorkout({ route, navigation }: Props) {
  const { workoutId, libraryId, dateKey } = route.params ?? {};
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
  const lastClipEndTime = useRef(0);
  const prevProcessedSecondRef = useRef(-1);
  const hasNavigatedToPostWorkout = useRef(false);
  const formData = useRef<FormAssessmentData>({
    errorCount: {},
    frameCount: 0,
    goodFrames: 0,
  });
  const sessionLog = useRef<SessionLogEntry[]>([]);
  const currentErrors = useRef<Set<string>>(new Set());
  const sustainedClean = useRef(false);

  currentExerciseRef.current = currentExercise;

  useEffect(() => {
    formData.current = { errorCount: {}, frameCount: 0, goodFrames: 0 };
    currentErrors.current.clear();
    sustainedClean.current = false;
  }, [currentExercise]);

  const handleErrorStateChange = useCallback(
    (errorKey: string, isActive: boolean) => {
      if (isActive) {
        currentErrors.current.add(errorKey);
        sustainedClean.current = false;
      } else {
        currentErrors.current.delete(errorKey);
      }
    },
    []
  );

  const navigateToPostWorkout = useCallback(() => {
    if (!workoutId || hasNavigatedToPostWorkout.current) {
      return;
    }

    hasNavigatedToPostWorkout.current = true;
    navigation.navigate('PostWorkout', {
      workoutId,
      libraryId,
      dateKey: dateKey ?? undefined,
      sessionLog: sessionLog.current,
    });
  }, [navigation, workoutId, libraryId, dateKey]);

  const queueClip = useCallback(
    async (
      clipNumber: string,
      meta: {
        exercise: string;
        type: SessionLogEntry['type'];
      }
    ) => {
      const now = timerSecondsRef.current;

      if (clipPlaying.current) {
        return;
      }

      if (now - lastClipEndTime.current < 3) {
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
            clipPlaying.current = false;
            await baseTrackRef.current?.setVolumeAsync(1.0);
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
              lastClipEndTime.current = timerSecondsRef.current;
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
    prevProcessedSecondRef.current = -1;
    setShowOnboarding(false);
    setWorkoutStarted(true);
    void loadAndPlayBaseTrack();
  }, [loadAndPlayBaseTrack]);

  const skipToEnd = useCallback(async () => {
    if (!workout) {
      return;
    }

    const skipSeconds = Math.max(
      0,
      Math.floor(getTrackDurationSeconds(workout) - 15.22)
    );

    setShowOnboarding(false);

    if (!workoutStarted) {
      setWorkoutStarted(true);
    }

    if (!baseTrackRef.current) {
      await loadAndPlayBaseTrack();
    }

    const sound = baseTrackRef.current;
    if (!sound) {
      return;
    }

    try {
      await configureWorkoutAudioMode();
      await sound.setPositionAsync(skipSeconds * 1000);

      const status = await sound.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await sound.playAsync();
      }
    } catch (error) {
      console.warn('[LiveWorkout] skip seek failed:', error);
      return;
    }

    timerSecondsRef.current = skipSeconds;
    setTimerSeconds(skipSeconds);
    prevProcessedSecondRef.current = skipSeconds - 1;
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
      void (async () => {
        if (!baseTrackRef.current) {
          return;
        }

        try {
          const status = await baseTrackRef.current.getStatusAsync();
          if (!status.isLoaded || !status.isPlaying) {
            return;
          }

          const t = Math.floor(status.positionMillis / 1000);
          timerSecondsRef.current = t;
          setTimerSeconds(t);

          if (t === prevProcessedSecondRef.current) {
            return;
          }
          prevProcessedSecondRef.current = t;

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
              if (
                t === window.start + 1 &&
                window.end - t >= 6 &&
                currentExerciseRef.current === exercise
              ) {
                onWindowOpen(exercise);
              }
            });
          });
        } catch {
          // Ignore transient audio status read failures.
        }
      })();
    }, 500);

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
    workoutStarted,
    currentErrors,
    handleErrorStateChange,
    sustainedClean
  );

  if (!workout) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: insets.top + WORKOUT_TOP_BAR_TOP, paddingLeft: scale(20) }}>
          <WorkoutBackButton onPress={handleBack} />
        </View>
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
      <WorkoutTopBar
        top={insets.top + WORKOUT_TOP_BAR_TOP}
        onBack={handleBack}
        timerSeconds={remainingSeconds}
        rightSlot={
          <PressableScale onPress={() => void skipToEnd()}>
            <Text style={workoutBottomPanelStyles.skipText}>Skip</Text>
          </PressableScale>
        }
      />

      <View
        style={[
          styles.mainContent,
          { paddingTop: getWorkoutMainContentPadding(insets.top) },
        ]}
      >
        <WorkoutVideoFrame
          overlay={
            <FadeSlideOverlay visible={showOnboarding}>
              <View style={styles.onboardingCard}>
                <View style={styles.onboardingGifPlaceholder}>
                  <Text style={styles.onboardingGifLabel}>
                    Place your device where your full body is visible from the
                    side
                  </Text>
                </View>
                <Text style={styles.onboardingHint}>
                  AI corrections will be announced with a ding so you know when
                  to listen
                </Text>
                <PressableScale style={styles.readyButton} onPress={handleReady}>
                  <Text style={styles.readyButtonText}>I&apos;m Ready</Text>
                </PressableScale>
              </View>
            </FadeSlideOverlay>
          }
        >
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
                    transform: 'scaleX(-1)',
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
        </WorkoutVideoFrame>
      </View>

      <View style={workoutBottomPanelStyles.panel}>
        <View style={workoutBottomPanelStyles.titleRow}>
          <View style={workoutBottomPanelStyles.titleBlock}>
            <Text style={workoutBottomPanelStyles.exerciseName}>
              {EXERCISE_LABELS[currentExercise]}
            </Text>
            <Text style={workoutBottomPanelStyles.currentExerciseLabel}>
              CURRENT EXERCISE
            </Text>
          </View>
          <ExerciseProgressRingFromExercise
            currentExercise={currentExercise}
          />
        </View>

        <View style={workoutBottomPanelStyles.statsRow}>
          <View style={workoutBottomPanelStyles.statItem}>
            <Text style={workoutBottomPanelStyles.statText}>
              {workout.duration} min
            </Text>
          </View>
          <View
            style={[
              workoutBottomPanelStyles.statItem,
              workoutBottomPanelStyles.statItemDivider,
            ]}
          >
            <Text style={workoutBottomPanelStyles.statText}>
              {workout.intensity.charAt(0).toUpperCase() +
                workout.intensity.slice(1)}
            </Text>
          </View>
          <View
            style={[
              workoutBottomPanelStyles.statItem,
              workoutBottomPanelStyles.statItemDivider,
            ]}
          >
            <Text style={workoutBottomPanelStyles.statText}>AI Tracked</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default memo(LiveWorkout);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark,
  },
  mainContent: {
    flex: 1,
  },
  cameraPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.dark,
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
    maxWidth: theme.component.dialogMaxWidth,
    backgroundColor: '#1a1a1a',
    borderRadius: theme.radius.xl,
    padding: theme.component.dialogPadding,
    alignItems: 'center',
  },
  onboardingGifPlaceholder: {
    width: scale(280),
    height: scale(200),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.component.cardPadding,
    marginBottom: theme.component.dialogSectionGap,
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
    marginBottom: theme.spacing.xxl,
  },
  readyButton: {
    width: '100%',
    backgroundColor: theme.colors.red,
    borderRadius: theme.radius.full,
    paddingVertical: theme.component.buttonPaddingVertical,
    paddingHorizontal: theme.component.buttonPaddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.component.buttonMinHeight,
  },
  readyButtonText: {
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
