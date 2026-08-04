import {
  createElement,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import CorrectionToast from '../components/CorrectionToast';
import LiveWorkoutNativeCamera from '../components/LiveWorkoutNativeCamera';
import { FadeSlideOverlay, PressableScale } from '../components/motion';
import {
  ExerciseProgressRingFromExercise,
  getWorkoutMainContentPadding,
  WORKOUT_TOP_BAR_TOP,
  WorkoutBackButton,
  WorkoutStat,
  WorkoutStatDivider,
  WorkoutTopBar,
  WorkoutVideoFrame,
  workoutBottomPanelStyles,
} from '../components/workout/WorkoutChrome';
import {
  getWorkoutById,
  type VoiceMode,
  type Workout,
} from '../data/workouts';
import {
  configureWorkoutAudioMode,
  preloadClipSounds,
  unloadClipSounds,
} from '../lib/workoutAudio';
import { auth } from '../lib/firebase';
import {
  fetchGeneratedWorkout,
  type GeneratedWorkoutDoc,
} from '../lib/generatePlan';
import {
  peekVoiceSession,
  type VoiceSessionPayload,
} from '../lib/voiceSessionCache';
import { SKIP_TAIL_SECONDS } from '../lib/workoutTimeline';
import {
  usePoseDetection,
  type FormAssessmentData,
  type PoseExercise,
  type SessionLogEntry,
} from '../hooks/usePoseDetection';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'LiveWorkout'>;

const TRACKED_ID_TO_POSE: Record<string, PoseExercise> = {
  'the-hundred': 'hundred',
  'long-stretch': 'long_stretch',
  'footwork-toes': 'footwork_toes',
};

function generatedToWorkout(doc: GeneratedWorkoutDoc): Workout {
  return {
    id: doc.slug,
    title: doc.title,
    description: doc.focus ? `Focus: ${doc.focus}` : '',
    duration: doc.estimatedDuration,
    intensity: doc.intensity,
    tags: [doc.focus],
    aiTracked: doc.exercises.some((ex) => ex.tracked),
    voiceMode: 'generated',
    exercises: doc.exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      cue: ex.cue,
      tracked: ex.tracked,
      meta:
        ex.repType === 'seconds'
          ? `${ex.reps}s`
          : `${ex.sets} × ${ex.reps}`,
    })),
  };
}

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

/** Human-readable form cues for the generated (TTS stub) path. */
const GENERATED_CORRECTION_MESSAGES: Record<string, string> = {
  hip_pike: 'Hips too high — lower into a straight line',
  hip_sag: 'Hips dropping — lift through your core',
  head_drop: 'Lift your head — keep the neck long',
  arms_sinking: 'Arms sinking — press down with control',
  knee_cave: 'Knees caving in — track over second toes',
  heels_drop: 'Heels dropping — stay light on the balls of your feet',
  rushing: 'Slow down — own each rep',
  hip_break: 'Hips breaking — keep a long spine',
  momentum: 'Less momentum — control the return',
};

/** Min gap between generated correction toasts (seconds). */
const GENERATED_CORRECTION_COOLDOWN_SEC = 8;

function messageForError(errorKey: string): string {
  return GENERATED_CORRECTION_MESSAGES[errorKey] ?? 'Check your form and reset';
}

function LiveWorkout({ route, navigation }: Props) {
  const { workoutId, libraryId, dateKey, generatedSlug } = route.params ?? {};
  const staticWorkout = workoutId ? getWorkoutById(workoutId) : undefined;
  const insets = useSafeAreaInsets();

  const [generatedDoc, setGeneratedDoc] = useState<GeneratedWorkoutDoc | null>(
    null
  );
  const [loadingGenerated, setLoadingGenerated] = useState(
    Boolean(generatedSlug)
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!generatedSlug) {
        setLoadingGenerated(false);
        return;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoadingGenerated(false);
        return;
      }
      try {
        const docData = await fetchGeneratedWorkout(uid, generatedSlug);
        if (!cancelled) {
          setGeneratedDoc(docData);
        }
      } catch (error) {
        console.warn('[LiveWorkout] generated load failed:', error);
      } finally {
        if (!cancelled) {
          setLoadingGenerated(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [generatedSlug]);

  const workout: Workout | undefined = generatedDoc
    ? generatedToWorkout(generatedDoc)
    : staticWorkout;

  /** Single audio fork for the session (shared pose/UI). */
  const voiceMode: VoiceMode =
    workout?.voiceMode ?? (generatedSlug ? 'generated' : 'generated');
  const isRecordedVoice = voiceMode === 'recorded';

  /** Timed generated session (clips + timeline from PrepareSession). */
  const voiceSessionRef = useRef<VoiceSessionPayload | null>(null);
  if (generatedSlug && voiceSessionRef.current == null) {
    voiceSessionRef.current = peekVoiceSession(generatedSlug);
  }
  const playedCueKeysRef = useRef<Set<string>>(new Set());
  const firedCorrectionWindowsRef = useRef<Set<string>>(new Set());
  const cueClipPlayingRef = useRef(false);
  const activeCueSoundRef = useRef<Audio.Sound | null>(null);
  /** Preloaded TTS cues — required so web autoplay works after Ready. */
  const generatedCueSoundsRef = useRef<Record<string, Audio.Sound>>({});
  const generatedCuesPreloadRef = useRef<Promise<void> | null>(null);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentExercise, setCurrentExercise] = useState<PoseExercise>('none');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [readyUnlocked, setReadyUnlocked] = useState(false);
  const [generatedToast, setGeneratedToast] = useState<string | null>(null);

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
  /** Wall-clock start for generated sessions (no basetrack clock). */
  const generatedStartedAtMsRef = useRef<number | null>(null);
  const lastGeneratedCorrectionSecRef = useRef(-Infinity);
  const formData = useRef<FormAssessmentData>({
    errorCount: {},
    frameCount: 0,
    goodFrames: 0,
  });
  const sessionLog = useRef<SessionLogEntry[]>([]);
  const currentErrors = useRef<Set<string>>(new Set());
  const sustainedClean = useRef(false);
  const isInFrameRef = useRef(false);

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
    const resolvedId = generatedSlug ?? workoutId;
    if (!resolvedId || hasNavigatedToPostWorkout.current) {
      return;
    }

    hasNavigatedToPostWorkout.current = true;
    navigation.navigate('PostWorkout', {
      workoutId: resolvedId,
      libraryId,
      dateKey: dateKey ?? undefined,
      sessionLog: sessionLog.current,
      durationSeconds: timerSecondsRef.current,
    });
  }, [navigation, workoutId, generatedSlug, libraryId, dateKey]);

  const firstTrackedPose = useCallback((): PoseExercise => {
    if (!generatedDoc) {
      return 'none';
    }
    for (const ex of generatedDoc.exercises) {
      const pose = TRACKED_ID_TO_POSE[ex.id];
      if (pose) {
        return pose;
      }
    }
    return 'none';
  }, [generatedDoc]);

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
      if (!isInFrameRef.current) {
        return;
      }

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

  /**
   * Generated voice path only — toast corrections during timed windows.
   * Base coach audio is the scheduled TTS cue clips (not per-correction speech).
   */
  const playGeneratedCorrection = useCallback((message: string) => {
    // Never overlay a spoken coach cue
    if (cueClipPlayingRef.current) {
      return;
    }
    console.log('[LiveWorkout] generated correction:', message);
    setGeneratedToast(message);
    sessionLog.current.push({
      exercise: currentExerciseRef.current,
      clipPlayed: 'generated',
      timestamp: timerSecondsRef.current,
      type: 'correction',
    });
  }, []);

  const fireGeneratedWindowCorrection = useCallback(
    (exerciseId: string) => {
      if (!isInFrameRef.current) {
        return;
      }
      if (cueClipPlayingRef.current) {
        return;
      }

      const t = timerSecondsRef.current;
      if (
        t - lastGeneratedCorrectionSecRef.current <
        GENERATED_CORRECTION_COOLDOWN_SEC
      ) {
        return;
      }

      const data = formData.current;
      const totalFrames = data.frameCount;
      if (totalFrames === 0) {
        formData.current = { errorCount: {}, frameCount: 0, goodFrames: 0 };
        return;
      }

      const topError = Object.entries(data.errorCount).sort(
        ([, a], [, b]) => b - a
      )[0];
      const errorRatio = topError ? topError[1] / totalFrames : 0;

      if (errorRatio > 0.3 && topError) {
        lastGeneratedCorrectionSecRef.current = t;
        playGeneratedCorrection(messageForError(topError[0]));
      }

      formData.current = { errorCount: {}, frameCount: 0, goodFrames: 0 };
      void exerciseId;
    },
    [playGeneratedCorrection]
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

  const unloadGeneratedCueSounds = useCallback(async () => {
    const sounds = Object.values(generatedCueSoundsRef.current);
    generatedCueSoundsRef.current = {};
    activeCueSoundRef.current = null;
    cueClipPlayingRef.current = false;
    await Promise.all(
      sounds.map(async (sound) => {
        try {
          await sound.stopAsync();
        } catch {
          // ignore
        }
        try {
          await sound.unloadAsync();
        } catch {
          // ignore
        }
      })
    );
  }, []);

  /** Load any missing cue sounds without interrupting ones already playing. */
  const preloadGeneratedCueSounds = useCallback(
    async (session: VoiceSessionPayload) => {
      await configureWorkoutAudioMode();

      await Promise.all(
        session.clips.map(async (clip) => {
          if (generatedCueSoundsRef.current[clip.key]) {
            return;
          }
          try {
            const { sound } = await Audio.Sound.createAsync(
              { uri: clip.uri },
              { shouldPlay: false, volume: 1.0 }
            );
            // Another concurrent load may have won
            if (generatedCueSoundsRef.current[clip.key]) {
              try {
                await sound.unloadAsync();
              } catch {
                // ignore
              }
              return;
            }
            generatedCueSoundsRef.current[clip.key] = sound;
          } catch (error) {
            console.warn(
              `[LiveWorkout] failed to preload cue ${clip.key}:`,
              error
            );
          }
        })
      );

      console.log(
        '[LiveWorkout] preloaded generated cues:',
        Object.keys(generatedCueSoundsRef.current)
      );
    },
    []
  );

  const playGeneratedCue = useCallback(async (key: string, uri: string) => {
    try {
      await configureWorkoutAudioMode();

      // Stop any other cue mid-flight
      if (
        activeCueSoundRef.current &&
        generatedCueSoundsRef.current[key] !== activeCueSoundRef.current
      ) {
        try {
          await activeCueSoundRef.current.stopAsync();
          await activeCueSoundRef.current.setPositionAsync(0);
        } catch {
          // ignore
        }
      }

      let sound = generatedCueSoundsRef.current[key] ?? null;
      if (!sound) {
        const created = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false, volume: 1.0 }
        );
        sound = created.sound;
        generatedCueSoundsRef.current[key] = sound;
      }

      cueClipPlayingRef.current = true;
      activeCueSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          cueClipPlayingRef.current = false;
          if (activeCueSoundRef.current === sound) {
            activeCueSoundRef.current = null;
          }
        }
      });

      await sound.setPositionAsync(0);
      const status = await sound.playAsync();
      if (!status.isLoaded || status.isPlaying !== true) {
        // Fallback play attempt (web can need a second try after unlock)
        await sound.playAsync();
      }
      console.log('[LiveWorkout] playing cue', key);
    } catch (error) {
      console.warn('[LiveWorkout] cue play failed:', key, error);
      cueClipPlayingRef.current = false;
    }
  }, []);

  /** Start wall-clock timeline and fire intro immediately (user-gesture safe). */
  const startGeneratedTimeline = useCallback(async () => {
    if (generatedSlug) {
      voiceSessionRef.current =
        peekVoiceSession(generatedSlug) ?? voiceSessionRef.current;
    }

    const session = voiceSessionRef.current;
    if (!session?.clips.length) {
      console.warn(
        '[LiveWorkout] no voice session — generated timeline has no audio'
      );
      playedCueKeysRef.current = new Set();
      firedCorrectionWindowsRef.current = new Set();
      lastGeneratedCorrectionSecRef.current = -Infinity;
      generatedStartedAtMsRef.current = Date.now();
      timerSecondsRef.current = 0;
      prevProcessedSecondRef.current = -1;
      setTimerSeconds(0);
      setCurrentExercise(firstTrackedPose());
      return;
    }

    await configureWorkoutAudioMode();

    // Don't block on full preload (breaks web autoplay gesture window).
    // Prefer in-flight preload; ensure first cue loads next if needed.
    if (generatedCuesPreloadRef.current) {
      try {
        await Promise.race([
          generatedCuesPreloadRef.current,
          new Promise<void>((resolve) => {
            setTimeout(resolve, 80);
          }),
        ]);
      } catch {
        // continue — playGeneratedCue will load on demand
      }
    }

    playedCueKeysRef.current = new Set();
    firedCorrectionWindowsRef.current = new Set();
    lastGeneratedCorrectionSecRef.current = -Infinity;
    generatedStartedAtMsRef.current = Date.now();
    timerSecondsRef.current = 0;
    prevProcessedSecondRef.current = -1;
    setTimerSeconds(0);
    setCurrentExercise(firstTrackedPose());

    // Play the first due cue in the Ready tap path (unlocks web audio)
    const firstClip =
      session.clips.find((clip) => Math.floor(clip.start) <= 0) ??
      session.clips[0];
    if (firstClip) {
      playedCueKeysRef.current.add(firstClip.key);
      await playGeneratedCue(firstClip.key, firstClip.uri);
    }

    // Finish loading the rest in background if still incomplete
    if (
      Object.keys(generatedCueSoundsRef.current).length < session.clips.length
    ) {
      const task = preloadGeneratedCueSounds(session);
      generatedCuesPreloadRef.current = task;
      void task;
    }
  }, [
    firstTrackedPose,
    generatedSlug,
    playGeneratedCue,
    preloadGeneratedCueSounds,
  ]);

  // Preload TTS while onboarding so Ready can play immediately
  useEffect(() => {
    if (isRecordedVoice || !generatedSlug) {
      return;
    }

    const session =
      peekVoiceSession(generatedSlug) ?? voiceSessionRef.current;
    if (!session?.clips.length) {
      return;
    }
    voiceSessionRef.current = session;

    const task = preloadGeneratedCueSounds(session);
    generatedCuesPreloadRef.current = task;
    void task;

    return () => {
      // Sounds unloaded on full screen teardown only
    };
  }, [generatedSlug, isRecordedVoice, preloadGeneratedCueSounds]);

  const handleReady = useCallback(() => {
    prevProcessedSecondRef.current = -1;
    setShowOnboarding(false);
    setWorkoutStarted(true);

    // ── Audio fork ──────────────────────────────────────────────
    if (isRecordedVoice) {
      // recorded: basetrack + numbered clips (unchanged)
      void loadAndPlayBaseTrack();
    } else {
      // generated: timed timeline + scheduled cue clips
      void startGeneratedTimeline();
    }
  }, [isRecordedVoice, loadAndPlayBaseTrack, startGeneratedTimeline]);

  const skipToEnd = useCallback(async () => {
    if (!workout) {
      return;
    }

    setShowOnboarding(false);

    if (!workoutStarted) {
      setWorkoutStarted(true);
    }

    // Generated path: jump timeline clock to totalDuration − SKIP_TAIL_SECONDS
    if (!isRecordedVoice) {
      const session = voiceSessionRef.current;
      const total =
        session?.totalDurationSeconds ??
        getTrackDurationSeconds(workout);
      const skipSeconds = Math.max(0, Math.floor(total - SKIP_TAIL_SECONDS));

      if (generatedStartedAtMsRef.current == null) {
        await startGeneratedTimeline();
      }
      generatedStartedAtMsRef.current = Date.now() - skipSeconds * 1000;
      timerSecondsRef.current = skipSeconds;
      setTimerSeconds(skipSeconds);
      prevProcessedSecondRef.current = skipSeconds - 1;

      // Mark past cues as already played so we don't re-announce
      if (session) {
        session.clips.forEach((clip) => {
          if (clip.start <= skipSeconds) {
            playedCueKeysRef.current.add(clip.key);
          }
        });
        session.timeline.segments.forEach((seg) => {
          if (seg.correctionWindow.start + 1 <= skipSeconds) {
            firedCorrectionWindowsRef.current.add(
              `${seg.exerciseId}:${seg.correctionWindow.start}`
            );
          }
        });
      }

      // Stop any mid-cue
      if (activeCueSoundRef.current) {
        try {
          await activeCueSoundRef.current.stopAsync();
          await activeCueSoundRef.current.setPositionAsync(0);
        } catch {
          // ignore
        }
        activeCueSoundRef.current = null;
        cueClipPlayingRef.current = false;
      }
      return;
    }

    // Recorded path: seek basetrack to duration − SKIP_TAIL (uses audio length)
    if (!baseTrackRef.current) {
      await loadAndPlayBaseTrack();
    }

    const sound = baseTrackRef.current;
    if (!sound) {
      return;
    }

    try {
      await configureWorkoutAudioMode();
      const status = await sound.getStatusAsync();
      const durationMs =
        status.isLoaded && typeof status.durationMillis === 'number'
          ? status.durationMillis
          : getTrackDurationSeconds(workout) * 1000;
      const seekMs = Math.max(0, durationMs - SKIP_TAIL_SECONDS * 1000);
      await sound.setPositionAsync(seekMs);

      const after = await sound.getStatusAsync();
      if (after.isLoaded && !after.isPlaying) {
        await sound.playAsync();
      }

      const t = Math.floor(seekMs / 1000);
      timerSecondsRef.current = t;
      setTimerSeconds(t);
      prevProcessedSecondRef.current = t - 1;
      setCurrentExercise('footwork_toes');
    } catch (error) {
      console.warn('[LiveWorkout] skip seek failed:', error);
    }
  }, [
    workout,
    workoutStarted,
    loadAndPlayBaseTrack,
    startGeneratedTimeline,
    isRecordedVoice,
  ]);

  useEffect(() => {
    return () => {
      void baseTrackRef.current?.unloadAsync();
      void unloadClipSounds(clipSoundsRef.current);
      clipSoundsRef.current = {};
      void unloadGeneratedCueSounds();
      // Keep generated clip URIs cached when backing out so ClassDetail shows BEGIN.
    };
  }, [unloadGeneratedCueSounds]);

  useEffect(() => {
    if (!workoutStarted || Platform.OS === 'web') {
      return;
    }

    const timeout = setTimeout(() => {
      void configureWorkoutAudioMode();
    }, 600);

    return () => clearTimeout(timeout);
  }, [workoutStarted]);

  // ── Recorded path: basetrack clock + CORRECTION_WINDOWS (unchanged) ──
  useEffect(() => {
    if (!workoutStarted || !isRecordedVoice) {
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
  }, [workoutStarted, isRecordedVoice, onWindowOpen]);

  // ── Generated path: wall-clock timeline, scheduled cues, windowed corrections ──
  useEffect(() => {
    if (!workoutStarted || isRecordedVoice || !workout) {
      return;
    }

    const session =
      voiceSessionRef.current ??
      (generatedSlug ? peekVoiceSession(generatedSlug) : null);
    if (session) {
      voiceSessionRef.current = session;
    }

    const totalDuration =
      session?.totalDurationSeconds ?? getTrackDurationSeconds(workout);

    const interval = setInterval(() => {
      const startedAt = generatedStartedAtMsRef.current;
      // Wait until Ready finished starting the timeline (avoids double-start race)
      if (startedAt == null) {
        return;
      }

      const t = Math.floor((Date.now() - startedAt) / 1000);
      timerSecondsRef.current = t;
      setTimerSeconds(t);

      // Timeline completion is the single end source for generated sessions
      if (t >= totalDuration) {
        navigateToPostWorkout();
        return;
      }

      if (t === prevProcessedSecondRef.current) {
        return;
      }
      prevProcessedSecondRef.current = t;

      // Schedule cue clips at their cueStart (silent work between them)
      if (session) {
        for (const clip of session.clips) {
          if (playedCueKeysRef.current.has(clip.key)) {
            continue;
          }
          const startSec = Math.floor(clip.start);
          if (t < startSec) {
            continue;
          }
          // Grace: play if within a few seconds of cueStart (skip large jumps)
          if (t - startSec <= 3) {
            playedCueKeysRef.current.add(clip.key);
            void playGeneratedCue(clip.key, clip.uri);
          } else {
            // Past due after skip — don't flood
            playedCueKeysRef.current.add(clip.key);
          }
        }

        // Pose exercise only while inside a tracked segment's work block
        let pose: PoseExercise = 'none';
        for (const seg of session.timeline.segments) {
          if (t >= seg.workStart && t < seg.workEnd) {
            pose = TRACKED_ID_TO_POSE[seg.exerciseId] ?? 'none';
            break;
          }
        }
        if (pose !== 'none' && pose !== currentExerciseRef.current) {
          setCurrentExercise(pose);
        }

        // Windowed corrections from computed timeline (not fixed 15s intervals)
        for (const seg of session.timeline.segments) {
          const win = seg.correctionWindow;
          const windowKey = `${seg.exerciseId}:${win.start}`;
          if (firedCorrectionWindowsRef.current.has(windowKey)) {
            continue;
          }
          // Fire once near window open; requires room before workEnd so next cue is free
          if (
            t === Math.floor(win.start) + 1 &&
            win.end - t >= 3 &&
            !cueClipPlayingRef.current
          ) {
            firedCorrectionWindowsRef.current.add(windowKey);
            fireGeneratedWindowCorrection(seg.exerciseId);
          }
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [
    workoutStarted,
    isRecordedVoice,
    workout,
    generatedSlug,
    navigateToPostWorkout,
    playGeneratedCue,
    fireGeneratedWindowCorrection,
  ]);

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

  const { confidence, isInFrame } = usePoseDetection(
    videoRef,
    canvasRef,
    Platform.OS === 'web' ? currentExercise : 'none',
    formData,
    workoutStarted,
    currentErrors,
    handleErrorStateChange,
    sustainedClean,
    true,
    false,
    Platform.OS === 'web'
  );

  useEffect(() => {
    isInFrameRef.current = isInFrame;
  }, [isInFrame]);

  useEffect(() => {
    if (confidence > 0.6) {
      setReadyUnlocked(true);
    }
  }, [confidence]);

  if (loadingGenerated) {
    return (
      <View style={styles.container}>
        <View
          style={{
            paddingTop: insets.top + WORKOUT_TOP_BAR_TOP,
            paddingLeft: scale(20),
          }}
        >
          <WorkoutBackButton onPress={handleBack} />
        </View>
        <Text style={styles.notFound}>Loading class…</Text>
      </View>
    );
  }

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

  const lockStatus =
    confidence < 0.4
      ? { text: 'Looking for you…', color: '#989797' }
      : confidence <= 0.6
        ? { text: 'Almost — step back a little', color: '#E69639' }
        : { text: 'Got you ✓', color: '#79CBD0' };

  const showOutOfFrameBanner = workoutStarted && !isInFrame;

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
            <>
              <FadeSlideOverlay
                visible={showOnboarding}
                backdropColor="rgba(0,0,0,0.35)"
              >
                <View style={styles.onboardingCard}>
                  <View style={styles.onboardingGifPlaceholder}>
                    <Image
                      source={require('../../assets/images/demo.png')}
                      style={styles.onboardingDemoImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={styles.onboardingHint}>
                    Place your device where your full body is visible from the
                    side
                  </Text>
                  <Text
                    style={[styles.lockStatusText, { color: lockStatus.color }]}
                  >
                    {lockStatus.text}
                  </Text>
                  <PressableScale
                    style={[
                      styles.readyButton,
                      !readyUnlocked && styles.readyButtonDisabled,
                    ]}
                    onPress={readyUnlocked ? handleReady : undefined}
                    disabled={!readyUnlocked}
                  >
                    <Text style={styles.readyButtonText}>I&apos;m Ready</Text>
                  </PressableScale>
                </View>
              </FadeSlideOverlay>

              {showOutOfFrameBanner ? (
                <View style={styles.outOfFrameBanner} pointerEvents="none">
                  <View style={styles.outOfFrameMotif} />
                  <Text style={styles.outOfFrameText}>
                    Step back so I can see your full body
                  </Text>
                </View>
              ) : null}

              {!isRecordedVoice ? (
                <CorrectionToast
                  message={generatedToast}
                  onDismiss={() => setGeneratedToast(null)}
                />
              ) : null}
            </>
          }
        >
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
                  transform: 'scaleX(-1)',
                },
                autoPlay: true,
                playsInline: true,
                muted: true,
              })}
              {workoutStarted
                ? createElement('canvas', {
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
                  })
                : null}
            </>
          ) : (
            <LiveWorkoutNativeCamera />
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
              Current Exercise
            </Text>
          </View>
          <ExerciseProgressRingFromExercise
            currentExercise={currentExercise}
          />
        </View>

        <View style={workoutBottomPanelStyles.statsRow}>
          <WorkoutStat value={String(workout.duration)} label="Min" />
          <WorkoutStatDivider />
          <WorkoutStat
            value={
              workout.intensity.charAt(0).toUpperCase() +
              workout.intensity.slice(1)
            }
          />
          <WorkoutStatDivider />
          <WorkoutStat
            value={workout.aiTracked ? 'AI' : 'Guided'}
            label={workout.aiTracked ? 'Tracked' : undefined}
          />
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
  onboardingCard: {
    width: '100%',
    maxWidth: theme.component.dialogMaxWidth,
    backgroundColor: 'rgba(36, 33, 33, 0.72)',
    borderRadius: theme.radius.xl,
    padding: theme.component.dialogPadding,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  onboardingGifPlaceholder: {
    width: scale(280),
    height: scale(200),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.grey200,
    overflow: 'hidden',
    marginBottom: theme.component.dialogSectionGap,
  },
  onboardingDemoImage: {
    width: '100%',
    height: '100%',
  },
  onboardingHint: {
    ...theme.typography.body,
    color: `${theme.colors.white}cc`,
    fontSize: scale(13),
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: theme.spacing.md,
  },
  lockStatusText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  readyButton: {
    width: '100%',
    backgroundColor: theme.colors.red,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyButtonDisabled: {
    opacity: 0.35,
  },
  readyButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  outOfFrameBanner: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36,33,33,0.88)',
    borderRadius: scale(4),
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    gap: scale(10),
    maxWidth: '86%',
    zIndex: 5,
  },
  outOfFrameMotif: {
    width: scale(4),
    height: scale(4),
    backgroundColor: '#E69639',
  },
  outOfFrameText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.white,
    flexShrink: 1,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
