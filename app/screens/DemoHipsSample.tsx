import {
  createElement,
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { WorkoutVideoFrame } from '../components/workout/WorkoutChrome';
import {
  usePoseDetection,
  type FormAssessmentData,
} from '../hooks/usePoseDetection';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'DemoHipsSample'>;

const SAMPLE_VIDEO = require('../../assets/video/hips_rising_sample.mp4');
const FRAME_PADDING = 48;
/** Keep the sample smaller than full viewport. */
const FRAME_SCALE = 0.72;

function getSampleVideoSrc(): string {
  if (typeof SAMPLE_VIDEO === 'string') {
    return SAMPLE_VIDEO;
  }

  return Image.resolveAssetSource(SAMPLE_VIDEO)?.uri ?? '';
}

const SAMPLE_VIDEO_SRC = getSampleVideoSrc();

function fitVideoFrame(
  videoWidth: number,
  videoHeight: number,
  maxWidth: number,
  maxHeight: number
) {
  if (videoWidth <= 0 || videoHeight <= 0) {
    return { width: maxWidth, height: maxHeight * 0.56 };
  }

  const scaleFit =
    Math.min(maxWidth / videoWidth, maxHeight / videoHeight) * FRAME_SCALE;
  return {
    width: Math.round(videoWidth * scaleFit),
    height: Math.round(videoHeight * scaleFit),
  };
}

/**
 * Hidden landscape sample: video-sized Reflo red tick border + skeleton.
 * Hips rising → both hip nodes teal + centered "HIPS RISING". Plank → red nodes.
 * Route: /demo-hips-k4m9 (full-bleed, no phone chrome)
 */
function DemoHipsSample(_props: Props) {
  const [videoReady, setVideoReady] = useState(false);
  const [hipsRising, setHipsRising] = useState(false);
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

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
      if (errorKey === 'hip_pike') {
        setHipsRising(isActive);
      }

      if (isActive) {
        currentErrors.current.add(errorKey);
        sustainedClean.current = false;
      } else {
        currentErrors.current.delete(errorKey);
      }
    },
    []
  );

  const setVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
  }, []);

  const setCanvasNode = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
  }, []);

  const onVideoMeta = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoSize({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    }
    setVideoReady(true);
  }, []);

  usePoseDetection(
    videoRef,
    canvasRef,
    Platform.OS === 'web' ? 'long_stretch' : 'none',
    formData,
    videoReady,
    currentErrors,
    handleErrorStateChange,
    sustainedClean,
    false,
    true,
    videoReady,
    true
  );

  const frameSize = useMemo(
    () =>
      fitVideoFrame(
        videoSize.width,
        videoSize.height,
        Math.max(320, viewport.width - FRAME_PADDING * 2),
        Math.max(200, viewport.height - FRAME_PADDING * 2)
      ),
    [videoSize.width, videoSize.height, viewport.width, viewport.height]
  );

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Sample is web only</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport({ width, height });
      }}
    >
      <View
        style={[
          styles.stage,
          { width: frameSize.width, height: frameSize.height },
        ]}
      >
        <WorkoutVideoFrame
          style={styles.videoFrame}
          borderOptions={{ clipBorderRadius: 0, inset: scale(22) }}
          overlay={
            <View style={styles.cueWrap} pointerEvents="none">
              {hipsRising ? (
                <View style={styles.hipsRisingBadge}>
                  <Text style={styles.hipsRisingText}>HIPS RISING</Text>
                </View>
              ) : null}
            </View>
          }
        >
          {/* Pan media only — frame + red border stay centered. */}
          <View style={styles.mediaPan}>
            {createElement('video', {
              key: 'hips-sample-feed',
              ref: setVideoNode,
              src: SAMPLE_VIDEO_SRC,
              onLoadedMetadata: onVideoMeta,
              onLoadedData: onVideoMeta,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                backgroundColor: '#0E0E0E',
                filter: 'saturate(0.72)',
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
                pointerEvents: 'none',
                zIndex: 2,
              },
            })}
          </View>
        </WorkoutVideoFrame>
      </View>
    </View>
  );
}

export default memo(DemoHipsSample);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.workoutBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
  videoFrame: {
    flex: 1,
    width: '100%',
    height: '100%',
    marginHorizontal: 0,
    marginTop: 0,
  },
  mediaPan: {
    ...StyleSheet.absoluteFillObject,
    // Uniform zoom + pan (no stretch) so the body sits nearer center.
    transform: [{ scale: 1.05 }, { translateX: scale(-28) }],
  },
  cueWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: scale(52),
  },
  hipsRisingBadge: {
    backgroundColor: '#79CBD0',
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    borderRadius: scale(4),
  },
  hipsRisingText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
  notFound: {
    ...theme.typography.body,
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
