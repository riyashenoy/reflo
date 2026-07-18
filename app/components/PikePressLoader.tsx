import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

type Point = [number, number];

type PoseFrame = {
  floor: number;
  chains: Point[][];
  head: [number, number, number];
  guideDashedOpacity: number;
  guideSolidOpacity: number;
};

/** Full form-journey cycle: sink too low → rise too high → settle perfect. */
export const PIKE_PRESS_CYCLE_S = 4.5;

type Props = {
  size?: number;
  style?: ViewStyle;
};

function L(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function ES(u: number) {
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

function D(a: number) {
  return (a * Math.PI) / 180;
}

function dir(a: number): Point {
  return [Math.cos(D(a)), -Math.sin(D(a))];
}

function add(p: Point, d: Point, l: number): Point {
  return [p[0] + d[0] * l, p[1] + d[1] * l];
}

function norm(a: Point, b: Point): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const m = Math.hypot(dx, dy) || 1;
  return [dx / m, dy / m];
}

function XC(p: Point, r1: number, q: Point, r2: number): Point {
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
  return c1[1] < c2[1] ? c1 : c2;
}

function XC2(p: Point, r1: number, q: Point, r2: number, s: 1 | -1): Point {
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
  const cr = ux * (c1[1] - p[1]) - uy * (c1[0] - p[0]);
  return (cr >= 0 ? 1 : -1) === s ? c1 : c2;
}

function pose(t: number): PoseFrame {
  const u = (t % PIKE_PRESS_CYCLE_S) / PIKE_PRESS_CYCLE_S;

  function seg(a: number, b: number) {
    return u < a ? 0 : u > b ? 1 : ES((u - a) / (b - a));
  }

  // Rise begins the moment the sink finishes draining — no pause between.
  const sink = seg(0.08, 0.19) - seg(0.3, 0.41);
  const rise = seg(0.41, 0.52) - seg(0.64, 0.75);
  const ok = seg(0.8, 0.86) - seg(0.95, 0.99);

  const H: Point = [160, 168];
  let S: Point;
  let F: Point;
  let hip: Point;

  if (rise > 1e-4) {
    S = add(H, dir(L(113, 108, rise)), 44);
    F = [L(24, 50, rise), 168];
    hip = XC(F, 68, S, 52);
  } else {
    S = add(H, dir(L(113, 111, sink)), 44);
    F = [L(24, 36, sink), 168];
    hip = XC2(F, 68, S, 52, 1);
  }

  const g = Math.max(sink, rise);
  const head = add(S, norm(hip, S), 34);

  return {
    floor: 178,
    chains: [[F, hip, S, H]],
    head: [head[0], head[1], 17 * (1 + 0.05 * ok)],
    guideDashedOpacity: g * 0.95,
    guideSolidOpacity: ok * 0.9,
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

export default function PikePressLoader({ size = 120, style }: Props) {
  const [frame, setFrame] = useState(() => pose(0));
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const loop = (ts: number) => {
      if (startRef.current == null) {
        startRef.current = ts;
      }
      setFrame(pose((ts - startRef.current) / 1000));
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const height = size * (200 / 220);

  return (
    <View style={[styles.wrap, { width: size, height }, style]}>
      <Svg width={size} height={height} viewBox="0 0 220 200">
        <Line
          x1={24}
          y1={168}
          x2={150}
          y2={125}
          stroke="#79CBD0"
          strokeWidth={2.5}
          strokeDasharray="6 6"
          opacity={frame.guideDashedOpacity}
        />
        <Line
          x1={24}
          y1={168}
          x2={150}
          y2={125}
          stroke="#79CBD0"
          strokeWidth={2.5}
          opacity={frame.guideSolidOpacity}
        />
        <Line
          x1={14}
          y1={frame.floor}
          x2={206}
          y2={frame.floor}
          stroke="#EDEBE7"
          strokeWidth={2}
        />
        {frame.chains.map((chain, index) => (
          <Path
            key={index}
            d={chainPath(chain)}
            fill="none"
            stroke="#242121"
            strokeWidth={18}
            strokeLinejoin="miter"
            strokeMiterlimit={3}
            strokeLinecap="butt"
          />
        ))}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
