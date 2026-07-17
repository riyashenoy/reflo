import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

type ParticleSpec = [
  type: 0 | 1,
  color: string,
  angle: number,
  speed: number,
  size: number,
  delay: number,
  spin: number,
];

type ParticleFrame =
  | { kind: 'dot'; x: number; y: number; r: number; color: string; opacity: number }
  | {
      kind: 'arc';
      x: number;
      y: number;
      size: number;
      color: string;
      opacity: number;
      rotation: number;
    };

type Frame = {
  coneRecoil: number;
  particles: ParticleFrame[];
  head: [number, number, number];
};

type Props = {
  size?: number;
  style?: ViewStyle;
};

const CYCLE_S = 2.6;
const GRAVITY = 170;
/**
 * After the cone is rotated 180° around (78, 142), the mouth sits near here —
 * launch from the mouth so confetti still reads as coming out of the cone.
 */
const ORIGIN_X = 96;
const ORIGIN_Y = 118;

const PARTICLES: ParticleSpec[] = [
  // Slightly bigger + a touch more spread than the original
  [0, '#E89C3A', 82, 118, 9, 0.02, 0],
  [0, '#79CBD0', 48, 108, 10, 0.06, 0],
  [0, '#E89C3A', 22, 116, 10, 0.1, 0],
  [1, '#CC1D1D', 66, 132, 12, 0.04, 140],
  [1, '#79CBD0', 92, 112, 13, 0.08, -120],
  [1, '#CC1D1D', 14, 100, 12, 0.12, 160],
  [1, '#79CBD0', 36, 96, 11, 0, -100],
];

function D(a: number) {
  return (a * Math.PI) / 180;
}

function frameAt(t: number): Frame {
  const T = t % CYCLE_S;
  const coneRecoil = Math.max(0, 1 - T * 6);
  const particles: ParticleFrame[] = [];

  for (const spec of PARTICLES) {
    const [type, color, angle, speed, size, delay, spin] = spec;
    const tau = T - delay;
    if (tau <= 0) {
      continue;
    }

    const opacity =
      Math.min(1, tau * 8) * Math.max(0, Math.min(1, (1.15 - tau) / 0.25));
    if (opacity <= 0) {
      continue;
    }

    const x = ORIGIN_X + Math.cos(D(angle)) * speed * tau;
    const y =
      ORIGIN_Y - Math.sin(D(angle)) * speed * tau + 0.5 * GRAVITY * tau * tau;

    if (type === 0) {
      particles.push({ kind: 'dot', x, y, r: size, color, opacity });
    } else {
      particles.push({
        kind: 'arc',
        x,
        y,
        size,
        color,
        opacity,
        rotation: angle + spin * tau,
      });
    }
  }

  // Same head motion as your original — fully fades out (no leftover red dot)
  const t2 = Math.min(Math.max(0, T - 0.05), 1.2);
  const headFade = Math.max(0, Math.min(1, (1.2 - t2) / 0.3));
  const hx = ORIGIN_X + Math.cos(D(55)) * 108 * t2;
  const hy =
    ORIGIN_Y - Math.sin(D(55)) * 108 * t2 + 0.5 * GRAVITY * t2 * t2;
  const hr = 11 * Math.min(1, 0.2 + t2 * 6) * headFade;

  return {
    coneRecoil,
    particles,
    head: [hx, hy, hr],
  };
}

export default function ConfettiBurst({ size = 72, style }: Props) {
  const [frame, setFrame] = useState(() => frameAt(0));
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const loop = (ts: number) => {
      if (startRef.current == null) {
        startRef.current = ts;
      }
      setFrame(frameAt((ts - startRef.current) / 1000));
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Wider than tall so the flipped cone + burst aren't clipped at the sides.
  const width = size * 1.45;
  const height = size;
  const coneRotation = 180 - 4 * frame.coneRecoil;

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      <Svg
        width={width}
        height={height}
        viewBox="-20 40 260 170"
        style={{ overflow: 'visible' }}
      >
        {frame.particles.map((particle, index) =>
          particle.kind === 'dot' ? (
            <Circle
              key={`p-${index}`}
              cx={particle.x}
              cy={particle.y}
              r={particle.r}
              fill={particle.color}
              opacity={particle.opacity}
            />
          ) : (
            <Path
              key={`p-${index}`}
              d={`M ${-particle.size} 0 A ${particle.size} ${particle.size} 0 0 1 ${particle.size} 0`}
              fill="none"
              stroke={particle.color}
              strokeWidth={6.5}
              strokeLinecap="round"
              opacity={particle.opacity}
              transform={`translate(${particle.x.toFixed(1)} ${particle.y.toFixed(1)}) rotate(${particle.rotation.toFixed(1)})`}
            />
          )
        )}
        {frame.head[2] > 0.4 ? (
          <Circle
            cx={frame.head[0]}
            cy={frame.head[1]}
            r={frame.head[2]}
            fill="#CC1D1D"
          />
        ) : null}
        <G transform={`rotate(${coneRotation.toFixed(2)} 78 142)`}>
          <Path
            d="M116 100 L34 130 L86 184 Z"
            fill="#242121"
            stroke="#242121"
            strokeWidth={12}
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
