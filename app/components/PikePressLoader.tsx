import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

type Point = [number, number];

type PoseFrame = {
  floor: number;
  chains: Point[][];
  head: [number, number, number];
};

export const PIKE_PRESS_CYCLE_S = 4.4;

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

function pose(t: number): PoseFrame {
  const k = PP(t, PIKE_PRESS_CYCLE_S, 0.12);
  const H: Point = [160, 168];
  const S = add(H, dir(L(113, 95, k)), 44);
  const F: Point = [L(24, 94, k), 168];
  const hip = XC(F, 68, S, 52);
  const head = add(S, norm(hip, S), 34);
  return {
    floor: 178,
    chains: [[F, hip, S, H]],
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
