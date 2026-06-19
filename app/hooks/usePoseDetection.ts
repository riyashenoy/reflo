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

export type FormAssessmentData = {
  errorCount: Record<string, number>;
  frameCount: number;
  goodFrames: number;
};

export type SessionLogEntry = {
  exercise: string;
  clipPlayed: string;
  timestamp: number;
  type: 'correction' | 'positive' | 'motivation';
};

export function usePoseDetection(
  _videoRef: RefObject<HTMLVideoElement | null>,
  _currentExercise: PoseExercise,
  _formDataRef: RefObject<FormAssessmentData>
) {
  return { isDetecting: false, poses: [] as DetectedPose[] };
}
