import {
  createElement,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  getWorkoutMainContentPadding,
  RepProgressCounter,
  WORKOUT_TOP_BAR_TOP,
  WorkoutTopBar,
  WorkoutVideoFrame,
  WorkoutVolumeButton,
  workoutBottomPanelStyles,
} from '../components/workout/WorkoutChrome';
import {
  usePoseDetection,
  type FormAssessmentData,
} from '../hooks/usePoseDetection';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'DemoWorkout'>;

const DEMO_VIDEO = require('../../assets/video/pike_to_plank.mp4');
const DEMO_VIDEO_ZOOM = 1.22;
const DEMO_VIDEO_OFFSET_X = '-3%';
const DEMO_REP_COUNT = 2;
const DEMO_TOTAL_REPS = 10;

function getDemoVideoSrc(): string {
  if (typeof DEMO_VIDEO === 'string') {
    return DEMO_VIDEO;
  }

  return Image.resolveAssetSource(DEMO_VIDEO)?.uri ?? '';
}

const DEMO_VIDEO_SRC = getDemoVideoSrc();

const mediaTransform = `scale(${DEMO_VIDEO_ZOOM}) translateX(${DEMO_VIDEO_OFFSET_X})`;

function DemoWorkout({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const formData = useRef<FormAssessmentData>({
    errorCount: {},
    frameCount: 0,
    goodFrames: 0,
  });
  const currentErrors = useRef<Set<string>>(new Set());
  const sustainedClean = useRef(false);

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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
  }, []);

  const setCanvasNode = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
  }, []);

  useEffect(() => {
    if (!videoReady) {
      return;
    }

    const syncTimer = () => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration)) {
        return;
      }

      const remaining = Math.max(
        0,
        Math.floor(video.duration - video.currentTime)
      );
      setTimerSeconds(remaining);
    };

    syncTimer();
    const interval = setInterval(syncTimer, 500);

    return () => clearInterval(interval);
  }, [videoReady]);

  usePoseDetection(
    videoRef,
    canvasRef,
    Platform.OS === 'web' ? 'long_stretch' : 'none',
    formData,
    videoReady,
    currentErrors,
    handleErrorStateChange,
    sustainedClean,
    false
  );

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Demo workout is web only</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WorkoutTopBar
        top={insets.top + WORKOUT_TOP_BAR_TOP}
        onBack={handleBack}
        timerSeconds={timerSeconds}
        rightSlot={<WorkoutVolumeButton />}
      />

      <View
        style={[
          styles.mainContent,
          { paddingTop: getWorkoutMainContentPadding(insets.top) },
        ]}
      >
        <WorkoutVideoFrame>
          {createElement('video', {
            key: 'demo-feed',
            ref: setVideoNode,
            src: DEMO_VIDEO_SRC,
            onLoadedData: () => {
              setVideoReady(true);
              const video = videoRef.current;
              if (video && Number.isFinite(video.duration)) {
                setTimerSeconds(Math.floor(video.duration));
              }
            },
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: mediaTransform,
              transformOrigin: 'center center',
            },
            autoPlay: true,
            loop: true,
            muted: true,
            playsInline: true,
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
              transform: mediaTransform,
              transformOrigin: 'center center',
            },
          })}
        </WorkoutVideoFrame>
      </View>

      <View style={workoutBottomPanelStyles.panel}>
        <View style={workoutBottomPanelStyles.titleRow}>
          <View style={workoutBottomPanelStyles.titleBlock}>
            <Text style={workoutBottomPanelStyles.exerciseName}>
              Pike to Plank
            </Text>
            <Text style={workoutBottomPanelStyles.currentExerciseLabel}>
              CURRENT EXERCISE
            </Text>
          </View>
          <RepProgressCounter rep={DEMO_REP_COUNT} totalReps={DEMO_TOTAL_REPS} />
        </View>

        <View style={workoutBottomPanelStyles.statsRow}>
          <View style={workoutBottomPanelStyles.statItem}>
            <Text style={workoutBottomPanelStyles.statText}>10 Reps</Text>
          </View>
          <View
            style={[
              workoutBottomPanelStyles.statItem,
              workoutBottomPanelStyles.statItemDivider,
            ]}
          >
            <Text style={workoutBottomPanelStyles.statText}>3 Sets</Text>
          </View>
          <View
            style={[
              workoutBottomPanelStyles.statItem,
              workoutBottomPanelStyles.statItemDivider,
            ]}
          >
            <Text style={workoutBottomPanelStyles.statText}>1 Spring</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default memo(DemoWorkout);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark,
  },
  mainContent: {
    flex: 1,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
