import { useEffect, useRef, useState, type RefObject } from 'react';

import { clearSkeleton, drawSkeleton } from '../lib/poseSkeleton.web';
import type {
  DetectedPose,
  FormAssessmentData,
  PoseExercise,
} from './usePoseDetection';

type Landmark = { x: number; y: number; score: number };

// MoveNet 17-keypoint indices
const LANDMARK_INDICES = {
  nose: 0,
  left_shoulder: 5,
  left_wrist: 9,
  left_hip: 11,
  left_knee: 13,
  left_ankle: 15,
} as const;

const LANDMARK_ORDER = [
  'nose',
  'left_shoulder',
  'left_wrist',
  'left_hip',
  'left_knee',
  'left_ankle',
] as const;

const MIN_SCORE = 0.6;

function getAngle(
  A: { x: number; y: number },
  B: { x: number; y: number },
  C: { x: number; y: number }
): number {
  const AB = { x: A.x - B.x, y: A.y - B.y };
  const CB = { x: C.x - B.x, y: C.y - B.y };
  const dot = AB.x * CB.x + AB.y * CB.y;
  const mag =
    Math.sqrt(AB.x ** 2 + AB.y ** 2) * Math.sqrt(CB.x ** 2 + CB.y ** 2);
  if (mag === 0) {
    return 0;
  }
  return Math.acos(Math.min(1, Math.max(-1, dot / mag))) * (180 / Math.PI);
}

function extractLandmarks(
  keypoints: Array<{ x: number; y: number; score?: number }>
): Landmark[] | null {
  const landmarks: Landmark[] = [];

  for (const name of LANDMARK_ORDER) {
    const kp = keypoints[LANDMARK_INDICES[name]];
    if (!kp || (kp.score ?? 0) < MIN_SCORE) {
      return null;
    }
    landmarks.push({
      x: kp.x,
      y: kp.y,
      score: kp.score ?? 1,
    });
  }

  return landmarks;
}

function detectError(
  landmarks: Landmark[],
  exercise: PoseExercise,
  ankleBaselineY: number | null
): { errorKey: string | null; ankleBaselineY: number | null } {
  if (exercise === 'none') {
    return { errorKey: null, ankleBaselineY };
  }

  const [nose, shoulder, wrist, hip, knee, ankle] = landmarks;

  if (exercise === 'hundred') {
    if (nose.y > shoulder.y - 15) {
      return { errorKey: 'head_drop', ankleBaselineY };
    }
    if (wrist.y > hip.y + 25) {
      return { errorKey: 'arms_sinking', ankleBaselineY };
    }
    return { errorKey: null, ankleBaselineY };
  }

  if (exercise === 'long_stretch') {
    const hipAngle = getAngle(shoulder, hip, knee);

    if (hipAngle > 195) {
      return { errorKey: 'hip_pike', ankleBaselineY };
    }
    if (hipAngle < 160) {
      return { errorKey: 'hip_sag', ankleBaselineY };
    }
    if (nose.y > shoulder.y + 30) {
      return { errorKey: 'head_drop', ankleBaselineY };
    }
    return { errorKey: null, ankleBaselineY };
  }

  if (exercise === 'footwork_toes') {
    const baseline = ankleBaselineY;
    if (baseline === null) {
      return { errorKey: null, ankleBaselineY: ankle.y };
    }

    if (ankle.y > baseline + 20) {
      return { errorKey: 'heels_drop', ankleBaselineY: baseline };
    }
    if (Math.abs(knee.x - ankle.x) > 30) {
      return { errorKey: 'knee_cave', ankleBaselineY: baseline };
    }
    return { errorKey: null, ankleBaselineY: baseline };
  }

  return { errorKey: null, ankleBaselineY };
}

export function usePoseDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  currentExercise: PoseExercise,
  formDataRef: RefObject<FormAssessmentData>,
  workoutStarted: boolean
) {
  const [isDetecting, setIsDetecting] = useState(false);
  const landmarkHistory = useRef<Landmark[][]>([]);
  const ankleBaselineY = useRef<number | null>(null);
  const currentExerciseRef = useRef(currentExercise);
  const formDataRefStable = useRef(formDataRef);
  const rafId = useRef(0);

  currentExerciseRef.current = currentExercise;
  formDataRefStable.current = formDataRef;

  useEffect(() => {
    ankleBaselineY.current = null;
  }, [currentExercise]);

  function getSmoothed(raw: Landmark[]): Landmark[] {
    landmarkHistory.current.push(
      raw.map((landmark) => ({
        x: landmark.x,
        y: landmark.y,
        score: landmark.score,
      }))
    );
    if (landmarkHistory.current.length > 5) {
      landmarkHistory.current.shift();
    }

    return raw.map((_, index) => ({
      x:
        landmarkHistory.current.reduce(
          (sum, frame) => sum + frame[index].x,
          0
        ) / landmarkHistory.current.length,
      y:
        landmarkHistory.current.reduce(
          (sum, frame) => sum + frame[index].y,
          0
        ) / landmarkHistory.current.length,
      score:
        landmarkHistory.current[landmarkHistory.current.length - 1][index]
          .score,
    }));
  }

  function recordFrameAssessment(landmarks: Landmark[]) {
    const exercise = currentExerciseRef.current;
    const formData = formDataRefStable.current.current;
    if (!formData || exercise === 'none') {
      return;
    }

    const { errorKey, ankleBaselineY: nextBaseline } = detectError(
      landmarks,
      exercise,
      ankleBaselineY.current
    );
    ankleBaselineY.current = nextBaseline;

    formData.frameCount += 1;
    if (errorKey) {
      formData.errorCount[errorKey] =
        (formData.errorCount[errorKey] ?? 0) + 1;
    } else {
      formData.goodFrames += 1;
    }
  }

  useEffect(() => {
    if (!workoutStarted || currentExercise === 'none') {
      setIsDetecting(false);
      landmarkHistory.current = [];
      clearSkeleton(canvasRef.current);
      return;
    }

    let disposed = false;
    let detector: { estimatePoses: Function; dispose: () => void } | null =
      null;
    let inFlight = false;
    let lastDetectTime = 0;
    const DETECT_INTERVAL_MS = 100;

    const stopLoop = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = 0;
      }
    };

    const init = async () => {
      try {
        const tf = await import('@tensorflow/tfjs');
        await import('@tensorflow/tfjs-backend-webgl');
        const poseDetection = await import('@tensorflow-models/pose-detection');

        if (disposed) {
          return;
        }

        try {
          await tf.setBackend('webgl');
          await tf.ready();
        } catch (webglError) {
          console.warn('[usePoseDetection] WebGL unavailable, using CPU:', webglError);
          await tf.setBackend('cpu');
          await tf.ready();
        }

        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        if (disposed) {
          detector?.dispose();
          return;
        }

        setIsDetecting(true);

        const loop = async () => {
          if (disposed) {
            return;
          }

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const now = performance.now();

          if (
            video &&
            video.readyState >= 2 &&
            detector &&
            !inFlight &&
            now - lastDetectTime >= DETECT_INTERVAL_MS
          ) {
            lastDetectTime = now;
            inFlight = true;
            try {
              const detectedPoses = (await detector.estimatePoses(
                video
              )) as DetectedPose[];

              if (canvas) {
                drawSkeleton(detectedPoses, canvas, video);
              }

              if (detectedPoses.length > 0) {
                const raw = extractLandmarks(detectedPoses[0].keypoints);
                if (raw) {
                  const smoothed = getSmoothed(raw);
                  recordFrameAssessment(smoothed);
                }
              }
            } catch (error) {
              console.warn('[usePoseDetection] frame failed:', error);
            } finally {
              inFlight = false;
            }
          }

          rafId.current = requestAnimationFrame(() => {
            void loop();
          });
        };

        rafId.current = requestAnimationFrame(() => {
          void loop();
        });
      } catch (error) {
        console.error('[usePoseDetection] init failed:', error);
        setIsDetecting(false);
        clearSkeleton(canvasRef.current);
      }
    };

    void init();

    return () => {
      disposed = true;
      stopLoop();
      landmarkHistory.current = [];
      ankleBaselineY.current = null;
      detector?.dispose();
      detector = null;
      setIsDetecting(false);
      clearSkeleton(canvasRef.current);
    };
  }, [canvasRef, currentExercise, videoRef, workoutStarted]);

  return { isDetecting, poses: [] as DetectedPose[] };
}
