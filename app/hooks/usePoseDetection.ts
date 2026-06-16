import type { RefObject } from 'react';

export type PoseExercise =
  | 'hundred'
  | 'long_stretch'
  | 'footwork_toes'
  | 'none';

export type DetectedKeypoint = {
  x: number;
  y: number;
  score?: number;
  name?: string;
};

export type DetectedPose = {
  keypoints: DetectedKeypoint[];
  score?: number;
};

export function usePoseDetection(
  _videoRef: RefObject<HTMLVideoElement | null>,
  _currentExercise: PoseExercise,
  _onCorrection: (message: string) => void
) {
  return { isDetecting: false, poses: [] as DetectedPose[] };
}
