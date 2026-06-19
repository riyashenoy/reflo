import { useEffect, useRef, useState, type RefObject } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

import type {
  DetectedPose,
  FormAssessmentData,
  PoseExercise,
} from './usePoseDetection';

type Landmark = { x: number; y: number; score: number };

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
  return Math.acos(Math.min(1, Math.max(-1, dot / mag))) * (180 / Math.PI);
}

function extractLandmarks(
  keypoints: poseDetection.Keypoint[]
): Landmark[] | null {
  const byName = new Map(
    keypoints.filter((kp) => kp.name).map((kp) => [kp.name!, kp])
  );

  const landmarks: Landmark[] = [];

  for (const name of LANDMARK_ORDER) {
    const kp = byName.get(name);
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
    let baseline = ankleBaselineY;
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
  currentExercise: PoseExercise,
  formDataRef: RefObject<FormAssessmentData>
) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [poses, setPoses] = useState<DetectedPose[]>([]);
  const landmarkHistory = useRef<Landmark[][]>([]);
  const ankleBaselineY = useRef<number | null>(null);
  const currentExerciseRef = useRef(currentExercise);
  const formDataRefStable = useRef(formDataRef);

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
    if (currentExercise === 'none') {
      setIsDetecting(false);
      setPoses([]);
      landmarkHistory.current = [];
      return;
    }

    let detector: poseDetection.PoseDetector | null = null;
    let animationId = 0;
    let disposed = false;
    let inFlight = false;

    const init = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();

        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        if (disposed) {
          detector.dispose();
          return;
        }

        setIsDetecting(true);

        const loop = async () => {
          if (disposed) {
            return;
          }

          const video = videoRef.current;
          if (video && video.readyState >= 2 && detector && !inFlight) {
            inFlight = true;
            try {
              const detectedPoses = await detector.estimatePoses(video);
              setPoses(detectedPoses as DetectedPose[]);
              if (detectedPoses.length > 0) {
                const raw = extractLandmarks(detectedPoses[0].keypoints);
                if (raw) {
                  const smoothed = getSmoothed(raw);
                  recordFrameAssessment(smoothed);
                }
              }
            } catch (error) {
              console.warn('[usePoseDetection] estimatePoses failed:', error);
            } finally {
              inFlight = false;
            }
          }

          animationId = requestAnimationFrame(() => {
            void loop();
          });
        };

        animationId = requestAnimationFrame(() => {
          void loop();
        });
      } catch (error) {
        console.error('[usePoseDetection] init failed:', error);
        setIsDetecting(false);
      }
    };

    void init();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      landmarkHistory.current = [];
      ankleBaselineY.current = null;
      detector?.dispose();
      setIsDetecting(false);
      setPoses([]);
    };
  }, [currentExercise, videoRef]);

  return { isDetecting, poses };
}
