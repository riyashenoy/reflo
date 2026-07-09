import type { DetectedPose } from '../hooks/usePoseDetection';

const SKELETON_DRAW_THRESHOLD = 0.3;
const DOT_RADIUS = 6;
const LINE_WIDTH = 2;
const COLOR_LERP_FACTOR = 0.1;

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

const COLOR_RED_DOT: Rgba = { r: 204, g: 29, b: 29, a: 1 };
const COLOR_TEAL_DOT: Rgba = { r: 121, g: 203, b: 208, a: 1 };
const COLOR_NEUTRAL_DOT: Rgba = { r: 255, g: 255, b: 255, a: 0.5 };

const COLOR_NEUTRAL_LINE: Rgba = { r: 255, g: 255, b: 255, a: 0.25 };

let currentDotColor: Rgba = { ...COLOR_NEUTRAL_DOT };

type CoverTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

function lerpChannel(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

function lerpRgba(current: Rgba, target: Rgba, factor = COLOR_LERP_FACTOR): Rgba {
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

function getTargetDotColor(errors: Set<string>, sustainedClean: boolean): Rgba {
  if (errors.size > 0) {
    return COLOR_RED_DOT;
  }

  if (sustainedClean) {
    return COLOR_TEAL_DOT;
  }

  return COLOR_NEUTRAL_DOT;
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

export function resetSkeletonColors() {
  currentDotColor = { ...COLOR_NEUTRAL_DOT };
}

export function drawSkeleton(
  poses: DetectedPose[],
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  errors: Set<string> = new Set(),
  sustainedClean = false,
  mirrorX = true
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

    const targetDot = getTargetDotColor(errors, sustainedClean);
    currentDotColor = lerpRgba(currentDotColor, targetDot);

    const dotColor = rgbaToCss(currentDotColor);
    const lineColor = rgbaToCss(COLOR_NEUTRAL_LINE);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = LINE_WIDTH;
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

    keypoints.forEach((kp) => {
      if ((kp.score ?? 0) > SKELETON_DRAW_THRESHOLD) {
        const point = mapPoint(kp.x, kp.y, transform, displayWidth, mirrorX);
        ctx.beginPath();
        ctx.arc(point.x, point.y, DOT_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = dotColor;
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

  resetSkeletonColors();

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
