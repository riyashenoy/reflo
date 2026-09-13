import type { DetectedPose } from '../hooks/usePoseDetection';
import { theme } from '../theme';

const SKELETON_DRAW_THRESHOLD = 0.3;
const DOT_RADIUS = 6;
const DEMO_DOT_RADIUS = 4;
const BOLD_DOT_RADIUS = 5;
const LINE_WIDTH = 2;
const BOLD_LINE_WIDTH = 3;
const DEMO_COLOR_LERP_FACTOR = 0.16;

const SKELETON_CONNECTIONS: [number, number][] = [
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 6],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

type Rgba = { r: number; g: number; b: number; a: number };

function hexToRgba(hex: string, a: number): Rgba {
  const normalized = hex.replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
    a,
  };
}

const COLOR_RED_DOT_DEMO = hexToRgba(theme.colors.red, 0.5);
/** Reflo teal #79CBD0 */
const COLOR_TEAL_DOT_DEMO = hexToRgba('#79CBD0', 0.5);
const COLOR_UNTRACKED: Rgba = { r: 255, g: 255, b: 255, a: 0.25 };

const COLOR_NEUTRAL_LINE: Rgba = { r: 255, g: 255, b: 255, a: 0.25 };

const jointTealFlashByKeypoint = new Map<number, number>();
const jointDotColorsByKeypoint = new Map<number, Rgba>();

const JOINT_TEAL_FLASH_MS = 1500;

/** MoveNet indices affected by each form error. */
const ERROR_KEYPOINT_INDICES: Record<string, number[]> = {
  head_drop: [0],
  arms_sinking: [7, 9],
  hip_pike: [5, 11, 13],
  hip_sag: [5, 11, 13],
  hip_break: [11, 13],
  heels_drop: [15],
  knee_cave: [13, 15],
  rushing: [11, 13],
  momentum: [11, 13],
};

/** Hips sample screen: highlight both hip joints only. */
const HIPS_SAMPLE_ERROR_KEYPOINT_INDICES: Record<string, number[]> = {
  hip_pike: [11, 12],
};

function keypointIndicesForError(errorKey: string, hipsSampleMode: boolean) {
  if (hipsSampleMode && HIPS_SAMPLE_ERROR_KEYPOINT_INDICES[errorKey]) {
    return HIPS_SAMPLE_ERROR_KEYPOINT_INDICES[errorKey];
  }
  return ERROR_KEYPOINT_INDICES[errorKey];
}

export function triggerDemoErrorFlash(
  errorKey: string,
  durationMs = JOINT_TEAL_FLASH_MS,
  hipsSampleMode = false
) {
  const keypointIndices = keypointIndicesForError(errorKey, hipsSampleMode);
  if (!keypointIndices?.length) {
    return;
  }

  const flashUntil = performance.now() + durationMs;
  keypointIndices.forEach((index) => {
    jointTealFlashByKeypoint.set(index, flashUntil);
  });
}

function isJointKeypointFlashing(index: number) {
  const flashUntil = jointTealFlashByKeypoint.get(index);
  if (!flashUntil) {
    return false;
  }

  if (performance.now() >= flashUntil) {
    jointTealFlashByKeypoint.delete(index);
    return false;
  }

  return true;
}

function getJointDotTargetColor(
  index: number,
  activeErrors: Set<string>,
  hipsSampleMode = false
): Rgba {
  for (const errorKey of activeErrors) {
    const indices = keypointIndicesForError(errorKey, hipsSampleMode);
    if (indices?.includes(index)) {
      return COLOR_TEAL_DOT_DEMO;
    }
  }

  // Hips sample: teal only while hip_pike is active — no lingering flash.
  if (hipsSampleMode) {
    return COLOR_RED_DOT_DEMO;
  }

  return isJointKeypointFlashing(index)
    ? COLOR_TEAL_DOT_DEMO
    : COLOR_RED_DOT_DEMO;
}

function getJointDotColor(
  index: number,
  activeErrors: Set<string>,
  hipsSampleMode = false
): Rgba {
  const target = getJointDotTargetColor(index, activeErrors, hipsSampleMode);
  const current =
    jointDotColorsByKeypoint.get(index) ?? { ...COLOR_RED_DOT_DEMO };
  const next = lerpRgba(current, target, DEMO_COLOR_LERP_FACTOR);
  jointDotColorsByKeypoint.set(index, next);
  return next;
}

type CoverTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

function lerpChannel(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

function lerpRgba(current: Rgba, target: Rgba, factor = DEMO_COLOR_LERP_FACTOR): Rgba {
  return {
    r: lerpChannel(current.r, target.r, factor),
    g: lerpChannel(current.g, target.g, factor),
    b: lerpChannel(current.b, target.b, factor),
    a: lerpChannel(current.a, target.a, factor),
  };
}

function rgbaToCss(color: Rgba) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a.toFixed(3)})`;
}

function getCoverTransform(
  videoWidth: number,
  videoHeight: number,
  displayWidth: number,
  displayHeight: number
): CoverTransform {
  const scale = Math.max(
    displayWidth / videoWidth,
    displayHeight / videoHeight
  );

  return {
    scale,
    offsetX: (videoWidth * scale - displayWidth) / 2,
    offsetY: (videoHeight * scale - displayHeight) / 2,
  };
}

function mapPoint(
  x: number,
  y: number,
  transform: CoverTransform,
  displayWidth: number,
  mirrorX: boolean
): { x: number; y: number } {
  const mappedX = x * transform.scale - transform.offsetX;
  const mappedY = y * transform.scale - transform.offsetY;

  return {
    x: mirrorX ? displayWidth - mappedX : mappedX,
    y: mappedY,
  };
}

function prepareCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
): {
  ctx: CanvasRenderingContext2D;
  transform: CoverTransform;
  displayWidth: number;
  displayHeight: number;
} | null {
  const ctx = canvas.getContext('2d');
  if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const rect = video.getBoundingClientRect();
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  if (displayWidth === 0 || displayHeight === 0) {
    return null;
  }

  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(displayWidth * dpr);
  const pixelHeight = Math.round(displayHeight * dpr);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    ctx,
    transform: getCoverTransform(
      video.videoWidth,
      video.videoHeight,
      displayWidth,
      displayHeight
    ),
    displayWidth,
    displayHeight,
  };
}

export function resetSkeletonColors(_demoMode = false) {
  jointTealFlashByKeypoint.clear();
  jointDotColorsByKeypoint.clear();
}

export function drawSkeleton(
  poses: DetectedPose[],
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  errors: Set<string> = new Set(),
  _sustainedClean = false,
  mirrorX = true,
  demoMode = false,
  untracked = false,
  boldSkeleton = false
) {
  try {
    const prepared = prepareCanvas(canvas, video);
    if (!prepared) {
      return;
    }

    const { ctx, transform, displayWidth, displayHeight } = prepared;
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    if (!poses.length) {
      return;
    }

    const keypoints = poses[0].keypoints;
    if (!keypoints?.length) {
      return;
    }

    const lineColor = rgbaToCss(untracked ? COLOR_UNTRACKED : COLOR_NEUTRAL_LINE);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = boldSkeleton ? BOLD_LINE_WIDTH : LINE_WIDTH;
    SKELETON_CONNECTIONS.forEach(([i, j]) => {
      const a = keypoints[i];
      const b = keypoints[j];
      if (
        a &&
        b &&
        (a.score ?? 0) > SKELETON_DRAW_THRESHOLD &&
        (b.score ?? 0) > SKELETON_DRAW_THRESHOLD
      ) {
        const start = mapPoint(a.x, a.y, transform, displayWidth, mirrorX);
        const end = mapPoint(b.x, b.y, transform, displayWidth, mirrorX);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    keypoints.forEach((kp, index) => {
      if ((kp.score ?? 0) > SKELETON_DRAW_THRESHOLD) {
        const point = mapPoint(kp.x, kp.y, transform, displayWidth, mirrorX);
        const radius = boldSkeleton
          ? BOLD_DOT_RADIUS
          : demoMode
            ? DEMO_DOT_RADIUS
            : DOT_RADIUS;
        const fillColor = rgbaToCss(
          untracked
            ? COLOR_UNTRACKED
            : getJointDotColor(
                index,
                demoMode ? errors : new Set(),
                boldSkeleton
              )
        );

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    });
  } catch (error) {
    console.warn('[drawSkeleton] failed:', error);
  }
}

export function clearSkeleton(canvas: HTMLCanvasElement | null) {
  if (!canvas) {
    return;
  }

  resetSkeletonColors(false);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
