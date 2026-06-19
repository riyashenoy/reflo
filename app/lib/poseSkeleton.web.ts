import type { DetectedPose } from '../hooks/usePoseDetection';

const SKELETON_DOT_COLOR = '#CC1D1D';
const SKELETON_LINE_COLOR = 'rgba(255, 255, 255, 0.45)';
const SKELETON_DRAW_THRESHOLD = 0.3;
const DOT_RADIUS = 6;
const LINE_WIDTH = 2;

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

type CoverTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

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
  transform: CoverTransform
): { x: number; y: number } {
  return {
    x: x * transform.scale - transform.offsetX,
    y: y * transform.scale - transform.offsetY,
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

export function drawSkeleton(
  poses: DetectedPose[],
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
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

    ctx.strokeStyle = SKELETON_LINE_COLOR;
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
        const start = mapPoint(a.x, a.y, transform);
        const end = mapPoint(b.x, b.y, transform);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    keypoints.forEach((kp) => {
      if ((kp.score ?? 0) > SKELETON_DRAW_THRESHOLD) {
        const point = mapPoint(kp.x, kp.y, transform);
        ctx.beginPath();
        ctx.arc(point.x, point.y, DOT_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = SKELETON_DOT_COLOR;
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

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
