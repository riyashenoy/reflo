import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

type Point = [number, number];

type PoseFrame = {
  chain: Point[];
  head: [number, number, number];
};

/** Idle rest between sets. */
const IDLE_S = 7;
/** One quick push-up rep. */
const REP_S = 1.3;
/** Reps per set. */
const REPS_PER_SET = 2;

type Props = {
  width?: number;
  style?: ViewStyle;
};

/** Cropped tight to the figure (starts at the floor line's left edge). */
const VIEW_X = 14;
const VIEW_Y = 85;
const VIEW_W = 192;
const VIEW_H = 105;

function L(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function ES(u: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

function PP(t: number, period: number, hold = 0.08) {
  const u = (t % period) / period;
  const r = 0.5 - hold;
  if (u < r) {
    return ES(u / r);
  }
  if (u < r + hold) {
    return 1;
  }
  if (u < 2 * r + hold) {
    return 1 - ES((u - r - hold) / r);
  }
  return 0;
}

function norm(a: Point, b: Point): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const m = Math.hypot(dx, dy) || 1;
  return [dx / m, dy / m];
}

function circleHits(p: Point, r1: number, q: Point, r2: number): [Point, Point] {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const dr = Math.hypot(dx, dy) || 1;
  const ux = dx / dr;
  const uy = dy / dr;
  const d = Math.min(dr, r1 + r2 - 0.01);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = p[0] + a * ux;
  const my = p[1] + a * uy;
  const c1: Point = [mx - uy * h, my + ux * h];
  const c2: Point = [mx + uy * h, my - ux * h];
  return [c1, c2];
}

/** Higher (smaller y) intersection of two circles. */
function XC(p: Point, r1: number, q: Point, r2: number): Point {
  const [c1, c2] = circleHits(p, r1, q, r2);
  return c1[1] < c2[1] ? c1 : c2;
}

/** Lower (larger y) intersection of two circles. */
function XCLow(p: Point, r1: number, q: Point, r2: number): Point {
  const [c1, c2] = circleHits(p, r1, q, r2);
  return c1[1] < c2[1] ? c2 : c1;
}

function pose(k: number): PoseFrame {
  // Wider stance so the rest pose matches the Reflō mark: shallower long
  // segment, splayed short segment, head floating up-right of the peak.
  const F: Point = [28, 168];
  const H: Point = [164, 168];
  // Dip stops at r2=30 so the under-elbow never breaks the floor line.
  const S = XC(F, 118, H, L(56, 30, k));
  const n = norm(F, S);
  const head: Point = [S[0] + n[0] * 36, S[1] + n[1] * 36 - 3];
  // Elbow: upper arm 24 + forearm 32 = 56, dead straight at rest (logo pose);
  // bends downward under the body as the figure dips.
  const E = XCLow(S, 24, H, 32);
  return {
    chain: [F, S, E, H],
    head: [head[0], head[1], 17],
  };
}

function chainPath(points: Point[]) {
  return points
    .map((point, index) => {
      const x = point[0].toFixed(1);
      const y = point[1].toFixed(1);
      return `${index ? 'L' : 'M'}${x} ${y}`;
    })
    .join('');
}

export default function PushupLogo({ width = 80, style }: Props) {
  const [frame, setFrame] = useState(() => pose(0));
  const startRef = useRef<number | null>(null);
  const wasIdleRef = useRef(true);
  const rafRef = useRef(0);

  useEffect(() => {
    const loop = (ts: number) => {
      if (startRef.current == null) {
        startRef.current = ts;
      }
      const t = (ts - startRef.current) / 1000;
      const phase = t % (IDLE_S + REP_S * REPS_PER_SET);
      const isIdle = phase < IDLE_S;

      // Rest in the Reflō logo pose; each set is two quick dips back into it.
      // PP loops every REP_S, so a longer active window plays multiple reps.
      if (!isIdle) {
        setFrame(pose(PP(phase - IDLE_S, REP_S, 0.1)));
        wasIdleRef.current = false;
      } else if (!wasIdleRef.current) {
        setFrame(pose(0));
        wasIdleRef.current = true;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const height = width * (VIEW_H / VIEW_W);

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      <Svg
        width={width}
        height={height}
        viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
      >
        <Line
          x1={14}
          y1={178}
          x2={206}
          y2={178}
          stroke="#EDEBE7"
          strokeWidth={2}
        />
        <Path
          d={chainPath(frame.chain)}
          fill="none"
          stroke="#242121"
          strokeWidth={18}
          strokeLinejoin="miter"
          strokeMiterlimit={3}
          strokeLinecap="butt"
        />
        <Circle
          cx={frame.head[0]}
          cy={frame.head[1]}
          r={frame.head[2]}
          fill="#CC1D1D"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
