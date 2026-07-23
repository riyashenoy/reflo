import { useEffect, useRef, useState, type RefObject } from 'react';

import {
  clearSkeleton,
  drawSkeleton,
  resetSkeletonColors,
  triggerDemoErrorFlash,
} from '../lib/poseSkeleton.web';
import type {
  DetectedPose,
  ErrorStateChangeHandler,
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
const ERROR_COOLDOWN_MS = 4000;
const SUSTAINED_CLEAN_MS = 2000;
/** MoveNet: left shoulder / hip / knee — minimum joints for angle checks. */
const CONFIDENCE_KEYPOINT_INDICES = [
  LANDMARK_INDICES.left_shoulder,
  LANDMARK_INDICES.left_hip,
  LANDMARK_INDICES.left_knee,
] as const;
const CONFIDENCE_HISTORY = 10;
const IN_FRAME_ENTER_MS = 1000;
const IN_FRAME_EXIT_MS = 2000;
const IN_FRAME_THRESHOLD = 0.4;
/** Per-second blend rate toward newest detect. Higher = snappier. */
const DEMO_SMOOTH_RATE = 12;
/** Light average of recent detects — enough to calm lines without feeling laggy. */
const DEMO_TARGET_HISTORY = 2;
const DEMO_DETECT_INTERVAL_MS = 66;
const LIVE_DETECT_INTERVAL_MS = 100;

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

function computeFrameConfidence(
  keypoints: Array<{ score?: number }> | undefined
): number {
  if (!keypoints?.length) {
    return 0;
  }

  let sum = 0;
  let count = 0;
  CONFIDENCE_KEYPOINT_INDICES.forEach((index) => {
    const keypoint = keypoints[index];
    if (!keypoint) {
      return;
    }
    sum += keypoint.score ?? 0;
    count += 1;
  });

  return count > 0 ? sum / count : 0;
}

export function usePoseDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  currentExercise: PoseExercise,
  formDataRef: RefObject<FormAssessmentData>,
  workoutStarted: boolean,
  currentErrorsRef?: RefObject<Set<string>>,
  onErrorStateChange?: ErrorStateChangeHandler,
  sustainedCleanRef?: RefObject<boolean>,
  mirrorOverlay = true,
  demoVisualMode = false,
  trackingEnabled = workoutStarted
) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [isInFrame, setIsInFrame] = useState(false);
  const landmarkHistory = useRef<Landmark[][]>([]);
  const demoKeypointHistory = useRef<DetectedPose['keypoints'][]>([]);
  const demoTargetKeypoints = useRef<DetectedPose['keypoints'] | null>(null);
  const demoDrawKeypoints = useRef<DetectedPose['keypoints'] | null>(null);
  const demoLastDrawTime = useRef(0);
  const ankleBaselineY = useRef<number | null>(null);
  const currentExerciseRef = useRef(currentExercise);
  const formDataRefStable = useRef(formDataRef);
  const currentErrorsRefStable = useRef(currentErrorsRef);
  const onErrorStateChangeRef = useRef(onErrorStateChange);
  const sustainedCleanRefStable = useRef(sustainedCleanRef);
  const mirrorOverlayRef = useRef(mirrorOverlay);
  const demoVisualModeRef = useRef(demoVisualMode);
  const workoutStartedRef = useRef(workoutStarted);
  const isInFrameRef = useRef(false);
  const confidenceHistory = useRef<number[]>([]);
  const aboveThresholdSince = useRef<number | null>(null);
  const belowThresholdSince = useRef<number | null>(null);
  const errorCooldownTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const cleanStreakStart = useRef<number | null>(null);
  const rafId = useRef(0);

  currentExerciseRef.current = currentExercise;
  formDataRefStable.current = formDataRef;
  currentErrorsRefStable.current = currentErrorsRef;
  onErrorStateChangeRef.current = onErrorStateChange;
  sustainedCleanRefStable.current = sustainedCleanRef;
  mirrorOverlayRef.current = mirrorOverlay;
  demoVisualModeRef.current = demoVisualMode;
  workoutStartedRef.current = workoutStarted;

  const clearErrorCooldowns = () => {
    errorCooldownTimers.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    errorCooldownTimers.current.clear();
  };

  const updateSustainedClean = () => {
    const sustainedCleanTarget = sustainedCleanRefStable.current;
    if (!sustainedCleanTarget) {
      return;
    }

    const hasActiveErrors =
      (currentErrorsRefStable.current?.current.size ?? 0) > 0;
    const cleanDuration =
      cleanStreakStart.current === null
        ? 0
        : performance.now() - cleanStreakStart.current;

    sustainedCleanTarget.current =
      !hasActiveErrors && cleanDuration >= SUSTAINED_CLEAN_MS;
  };

  const activateError = (errorKey: string) => {
    if (errorCooldownTimers.current.has(errorKey)) {
      return;
    }

    onErrorStateChangeRef.current?.(errorKey, true);

    triggerDemoErrorFlash(errorKey);

    const timeoutId = setTimeout(() => {
      errorCooldownTimers.current.delete(errorKey);
      onErrorStateChangeRef.current?.(errorKey, false);
      updateSustainedClean();
    }, ERROR_COOLDOWN_MS);

    errorCooldownTimers.current.set(errorKey, timeoutId);
  };

  useEffect(() => {
    ankleBaselineY.current = null;
    cleanStreakStart.current = null;
    clearErrorCooldowns();
    if (sustainedCleanRefStable.current) {
      sustainedCleanRefStable.current.current = false;
    }
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

  function setDemoTargetKeypoints(raw: DetectedPose['keypoints']) {
    demoKeypointHistory.current.push(raw.map((keypoint) => ({ ...keypoint })));
    if (demoKeypointHistory.current.length > DEMO_TARGET_HISTORY) {
      demoKeypointHistory.current.shift();
    }

    const frames = demoKeypointHistory.current;
    const frameCount = frames.length;
    const averaged = frames[0].map((_, index) => {
      let x = 0;
      let y = 0;
      let score = 0;
      frames.forEach((frame) => {
        const keypoint = frame[index];
        x += keypoint.x;
        y += keypoint.y;
        score += keypoint.score ?? 0;
      });
      return {
        ...frames[frameCount - 1][index],
        x: x / frameCount,
        y: y / frameCount,
        score: score / frameCount,
      };
    });

    demoTargetKeypoints.current = averaged;
    if (!demoDrawKeypoints.current) {
      demoDrawKeypoints.current = averaged.map((keypoint) => ({ ...keypoint }));
    }
  }

  function advanceDemoDrawKeypoints(now: number): DetectedPose['keypoints'] | null {
    const target = demoTargetKeypoints.current;
    const current = demoDrawKeypoints.current;
    if (!target) {
      return null;
    }
    if (!current || current.length !== target.length) {
      demoDrawKeypoints.current = target.map((keypoint) => ({ ...keypoint }));
      demoLastDrawTime.current = now;
      return demoDrawKeypoints.current;
    }

    const last = demoLastDrawTime.current || now;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    demoLastDrawTime.current = now;
    const alpha = 1 - Math.exp(-DEMO_SMOOTH_RATE * dt);

    const next = target.map((keypoint, index) => {
      const prior = current[index];
      const score = keypoint.score ?? 0;
      // Keep last good position if confidence drops briefly — avoids popping.
      if (score < 0.25 && prior) {
        return { ...prior, score };
      }
      return {
        ...keypoint,
        x: prior.x + (keypoint.x - prior.x) * alpha,
        y: prior.y + (keypoint.y - prior.y) * alpha,
      };
    });
    demoDrawKeypoints.current = next;
    return next;
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
      cleanStreakStart.current = null;
      if (sustainedCleanRefStable.current) {
        sustainedCleanRefStable.current.current = false;
      }
      formData.errorCount[errorKey] =
        (formData.errorCount[errorKey] ?? 0) + 1;
      activateError(errorKey);
    } else {
      formData.goodFrames += 1;
      if (cleanStreakStart.current === null) {
        cleanStreakStart.current = performance.now();
      }
      updateSustainedClean();
    }
  }

  function updateTrackingConfidence(
    frameConfidence: number,
    now: number
  ): number {
    confidenceHistory.current.push(frameConfidence);
    if (confidenceHistory.current.length > CONFIDENCE_HISTORY) {
      confidenceHistory.current.shift();
    }

    const smoothed =
      confidenceHistory.current.reduce((sum, value) => sum + value, 0) /
      confidenceHistory.current.length;

    setConfidence(smoothed);

    if (smoothed >= IN_FRAME_THRESHOLD) {
      belowThresholdSince.current = null;
      if (aboveThresholdSince.current == null) {
        aboveThresholdSince.current = now;
      }
      if (
        !isInFrameRef.current &&
        now - aboveThresholdSince.current >= IN_FRAME_ENTER_MS
      ) {
        isInFrameRef.current = true;
        setIsInFrame(true);
      }
    } else {
      aboveThresholdSince.current = null;
      if (belowThresholdSince.current == null) {
        belowThresholdSince.current = now;
      }
      if (
        isInFrameRef.current &&
        now - belowThresholdSince.current >= IN_FRAME_EXIT_MS
      ) {
        isInFrameRef.current = false;
        setIsInFrame(false);
      }
    }

    return smoothed;
  }

  useEffect(() => {
    if (!trackingEnabled) {
      setIsDetecting(false);
      setConfidence(0);
      setIsInFrame(false);
      isInFrameRef.current = false;
      confidenceHistory.current = [];
      aboveThresholdSince.current = null;
      belowThresholdSince.current = null;
      landmarkHistory.current = [];
      demoKeypointHistory.current = [];
      demoTargetKeypoints.current = null;
      demoDrawKeypoints.current = null;
      demoLastDrawTime.current = 0;
      clearSkeleton(canvasRef.current);
      resetSkeletonColors(demoVisualModeRef.current);
      return;
    }

    let disposed = false;
    let detector: { estimatePoses: Function; dispose: () => void } | null =
      null;
    let inFlight = false;
    let lastDetectTime = 0;
    const DETECT_INTERVAL_MS = demoVisualModeRef.current
      ? DEMO_DETECT_INTERVAL_MS
      : LIVE_DETECT_INTERVAL_MS;

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
        if (demoVisualModeRef.current) {
          resetSkeletonColors(true);
        }

        let lastDetectedPoses: DetectedPose[] = [];

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

              if (detectedPoses.length > 0) {
                updateTrackingConfidence(
                  computeFrameConfidence(detectedPoses[0].keypoints),
                  now
                );

                if (demoVisualModeRef.current) {
                  setDemoTargetKeypoints(detectedPoses[0].keypoints);
                } else {
                  lastDetectedPoses = detectedPoses;
                }

                // Only accumulate form while in-frame during an active workout.
                if (
                  workoutStartedRef.current &&
                  isInFrameRef.current
                ) {
                  const raw = extractLandmarks(detectedPoses[0].keypoints);
                  if (raw) {
                    const smoothed = getSmoothed(raw);
                    recordFrameAssessment(smoothed);
                  }
                }
              } else {
                updateTrackingConfidence(0, now);
              }
            } catch (error) {
              console.warn('[usePoseDetection] frame failed:', error);
            } finally {
              inFlight = false;
            }
          }

          if (demoVisualModeRef.current) {
            const drawKeypoints = advanceDemoDrawKeypoints(now);
            if (drawKeypoints) {
              lastDetectedPoses = [{ keypoints: drawKeypoints }];
            }
          }

          if (
            canvas &&
            video &&
            video.readyState >= 2 &&
            lastDetectedPoses.length > 0
          ) {
            drawSkeleton(
              lastDetectedPoses,
              canvas,
              video,
              currentErrorsRefStable.current?.current ?? new Set(),
              sustainedCleanRefStable.current?.current ?? false,
              mirrorOverlayRef.current,
              demoVisualModeRef.current,
              workoutStartedRef.current && !isInFrameRef.current
            );
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
      demoKeypointHistory.current = [];
      demoTargetKeypoints.current = null;
      demoDrawKeypoints.current = null;
      demoLastDrawTime.current = 0;
      confidenceHistory.current = [];
      aboveThresholdSince.current = null;
      belowThresholdSince.current = null;
      ankleBaselineY.current = null;
      cleanStreakStart.current = null;
      clearErrorCooldowns();
      if (sustainedCleanRefStable.current) {
        sustainedCleanRefStable.current.current = false;
      }
      detector?.dispose();
      detector = null;
      setIsDetecting(false);
      clearSkeleton(canvasRef.current);
      resetSkeletonColors(demoVisualModeRef.current);
    };
  }, [canvasRef, trackingEnabled, videoRef]);

  return {
    isDetecting,
    poses: [] as DetectedPose[],
    confidence,
    isInFrame,
  };
}
