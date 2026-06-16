import { useEffect, useRef, useState, type RefObject } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

import type { DetectedPose, PoseExercise } from './usePoseDetection';

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

export function usePoseDetection(
  videoRef: RefObject<HTMLVideoElement | null>,
  currentExercise: PoseExercise,
  onCorrection: (message: string) => void
) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [poses, setPoses] = useState<DetectedPose[]>([]);
  const landmarkHistory = useRef<Landmark[][]>([]);
  const cooldowns = useRef<Record<string, number>>({});
  const ankleBaselineY = useRef<number | null>(null);
  const onCorrectionRef = useRef(onCorrection);
  const currentExerciseRef = useRef(currentExercise);

  onCorrectionRef.current = onCorrection;
  currentExerciseRef.current = currentExercise;

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

  function canFire(key: string): boolean {
    const now = Date.now();
    if (cooldowns.current[key] && now - cooldowns.current[key] < 4000) {
      return false;
    }
    cooldowns.current[key] = now;
    return true;
  }

  function runDetection(landmarks: Landmark[]) {
    const exercise = currentExerciseRef.current;
    if (exercise === 'none') {
      return;
    }

    const [nose, shoulder, wrist, hip, knee, ankle] = landmarks;

    if (exercise === 'hundred') {
      if (nose.y > shoulder.y - 15 && canFire('head_drop')) {
        onCorrectionRef.current(
          'Head is dropping, curl higher, chin away from your chest'
        );
      }
      if (wrist.y > hip.y + 25 && canFire('arms_sinking')) {
        onCorrectionRef.current(
          'Your arms are sinking, lift them up, hovering not resting'
        );
      }
      return;
    }

    if (exercise === 'long_stretch') {
      const hipAngle = getAngle(shoulder, hip, knee);

      if (hipAngle > 195 && canFire('hip_pike')) {
        onCorrectionRef.current(
          'Your hips are rising, drop them down, squeeze the glutes'
        );
      }
      if (hipAngle < 160 && canFire('hip_sag')) {
        onCorrectionRef.current(
          'Hips dropping, squeeze and lift back up'
        );
      }
      if (nose.y > shoulder.y + 30 && canFire('head_drop')) {
        onCorrectionRef.current(
          'Head is dropping, curl higher, chin away from your chest'
        );
      }
      return;
    }

    if (exercise === 'footwork_toes') {
      if (ankleBaselineY.current === null) {
        ankleBaselineY.current = ankle.y;
        return;
      }

      if (
        ankle.y > ankleBaselineY.current + 20 &&
        canFire('heels_drop')
      ) {
        onCorrectionRef.current(
          'Your heels are starting to drop, keep them lifted, that is the whole point of this position'
        );
      }
      if (
        Math.abs(knee.x - ankle.x) > 30 &&
        canFire('knee_cave')
      ) {
        onCorrectionRef.current(
          'Your knees are caving inward, push them back out over your second toe'
        );
      }
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
                  runDetection(smoothed);
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
      cooldowns.current = {};
      detector?.dispose();
      setIsDetecting(false);
      setPoses([]);
    };
  }, [currentExercise, videoRef]);

  return { isDetecting, poses };
}
