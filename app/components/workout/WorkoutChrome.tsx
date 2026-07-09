import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from '../motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';
import type { PoseExercise } from '../../hooks/usePoseDetection';
import theme, { scale } from '../../theme';

export const WORKOUT_FRAME_MARGIN = scale(12);
export const WORKOUT_FRAME_RADIUS = scale(32);
export const WORKOUT_FRAME_BORDER_INSET = scale(10);
export const WORKOUT_FRAME_BORDER_RADIUS = scale(24);
export const WORKOUT_TICK_LENGTH = scale(7);
export const WORKOUT_TICK_SPACING = scale(7);
export const WORKOUT_TOP_BAR_HEIGHT = scale(36);
export const WORKOUT_TOP_BAR_TOP = scale(12);
export const WORKOUT_TOP_BAR_HORIZONTAL = scale(20);

export const REP_RING_SIZE = scale(46);
export const REP_RING_RADIUS = scale(21);
const REP_RING_CENTER = REP_RING_SIZE / 2;
const REP_RING_CIRCUMFERENCE = 2 * Math.PI * REP_RING_RADIUS;

export function getWorkoutMainContentPadding(topInset: number) {
  return topInset + WORKOUT_TOP_BAR_TOP + WORKOUT_TOP_BAR_HEIGHT + scale(8);
}

type Tick = { x1: number; y1: number; x2: number; y2: number };

function getRoundedRectPointAndNormal(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  distance: number
) {
  const topLen = x1 - x0 - 2 * radius;
  const rightLen = y1 - y0 - 2 * radius;
  const arcLen = (Math.PI / 2) * radius;

  let d = distance;

  if (d <= topLen) {
    return { x: x0 + radius + d, y: y0, nx: 0, ny: -1 };
  }
  d -= topLen;

  if (d <= arcLen) {
    const cx = x1 - radius;
    const cy = y0 + radius;
    const theta = -Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
    return {
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta),
      nx: Math.cos(theta),
      ny: Math.sin(theta),
    };
  }
  d -= arcLen;

  if (d <= rightLen) {
    return { x: x1, y: y0 + radius + d, nx: 1, ny: 0 };
  }
  d -= rightLen;

  if (d <= arcLen) {
    const cx = x1 - radius;
    const cy = y1 - radius;
    const theta = (d / arcLen) * (Math.PI / 2);
    return {
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta),
      nx: Math.cos(theta),
      ny: Math.sin(theta),
    };
  }
  d -= arcLen;

  if (d <= topLen) {
    return { x: x1 - radius - d, y: y1, nx: 0, ny: 1 };
  }
  d -= topLen;

  if (d <= arcLen) {
    const cx = x0 + radius;
    const cy = y1 - radius;
    const theta = Math.PI / 2 + (d / arcLen) * (Math.PI / 2);
    return {
      x: cx + radius * Math.cos(theta),
      y: cy + radius * Math.sin(theta),
      nx: Math.cos(theta),
      ny: Math.sin(theta),
    };
  }
  d -= arcLen;

  if (d <= rightLen) {
    return { x: x0, y: y1 - radius - d, nx: -1, ny: 0 };
  }
  d -= rightLen;

  const cx = x0 + radius;
  const cy = y0 + radius;
  const theta = Math.PI + (d / arcLen) * (Math.PI / 2);
  return {
    x: cx + radius * Math.cos(theta),
    y: cy + radius * Math.sin(theta),
    nx: Math.cos(theta),
    ny: Math.sin(theta),
  };
}

function buildRoundedRectTicks(
  width: number,
  height: number,
  inset: number,
  cornerRadius: number,
  tickLength: number,
  spacing: number
): Tick[] {
  if (width <= 0 || height <= 0) {
    return [];
  }

  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;
  const innerW = x1 - x0;
  const innerH = y1 - y0;
  const radius = Math.min(cornerRadius, innerW / 2, innerH / 2);

  const topLen = innerW - 2 * radius;
  const rightLen = innerH - 2 * radius;
  const arcLen = (Math.PI / 2) * radius;
  const perimeter = 2 * topLen + 2 * rightLen + 4 * arcLen;

  const ticks: Tick[] = [];

  for (let distance = 0; distance < perimeter; distance += spacing) {
    const point = getRoundedRectPointAndNormal(
      x0,
      y0,
      x1,
      y1,
      radius,
      distance
    );

    ticks.push({
      x1: point.x,
      y1: point.y,
      x2: point.x - point.nx * tickLength,
      y2: point.y - point.ny * tickLength,
    });
  }

  return ticks;
}

export function WorkoutTickFrameBorder({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const ticks = useMemo(
    () =>
      buildRoundedRectTicks(
        width,
        height,
        WORKOUT_FRAME_BORDER_INSET,
        WORKOUT_FRAME_BORDER_RADIUS,
        WORKOUT_TICK_LENGTH,
        WORKOUT_TICK_SPACING
      ),
    [width, height]
  );

  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {ticks.map((tick, index) => (
        <Line
          key={`tick-${index}`}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={theme.colors.red}
          strokeWidth={scale(2.5)}
          strokeLinecap="butt"
        />
      ))}
    </Svg>
  );
}

const PROGRESS_RING_SIZE = REP_RING_SIZE;
const PROGRESS_RING_RADIUS = REP_RING_RADIUS;
const PROGRESS_RING_CIRCUMFERENCE = REP_RING_CIRCUMFERENCE;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function formatWorkoutTimer(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return (
    Math.floor(total / 60) +
    ':' +
    (total % 60).toString().padStart(2, '0')
  );
}

function exerciseToNumber(exercise: PoseExercise): number {
  if (exercise === 'hundred') {
    return 1;
  }
  if (exercise === 'long_stretch') {
    return 2;
  }
  if (exercise === 'footwork_toes') {
    return 3;
  }
  return 0;
}

export function WorkoutSvgFrameBorder({
  width,
  height,
  inset = scale(2),
  borderRadius = WORKOUT_FRAME_RADIUS,
  strokeWidth = scale(4),
  strokeDasharray = `${scale(6)} ${scale(5)}`,
}: {
  width: number;
  height: number;
  inset?: number;
  borderRadius?: number;
  strokeWidth?: number;
  strokeDasharray?: string;
}) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Rect
        x={inset}
        y={inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        rx={borderRadius}
        fill="none"
        stroke={theme.colors.red}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
    </Svg>
  );
}

export function WorkoutBackButton({ onPress }: { onPress: () => void }) {
  return (
    <PressableScale style={styles.iconCircleButton} onPress={onPress}>
      <Text style={styles.backButtonText}>←</Text>
    </PressableScale>
  );
}

export function WorkoutVolumeButton() {
  return (
    <View style={styles.iconCircleButton}>
      <Ionicons name="volume-high" size={scale(15)} color={theme.colors.white} />
    </View>
  );
}

export function WorkoutTimerText({ seconds }: { seconds: number }) {
  return (
    <Text style={styles.timerText}>{formatWorkoutTimer(seconds)}</Text>
  );
}

export function ExerciseProgressRing({
  exerciseNumber,
  totalExercises = 3,
}: {
  exerciseNumber: number;
  totalExercises?: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = exerciseNumber > 0 ? exerciseNumber / totalExercises : 0;
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const center = PROGRESS_RING_SIZE / 2;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: reduceMotion ? 0 : motion.duration.slow,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, progress, reduceMotion]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [PROGRESS_RING_CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.progressRing}>
      <Svg
        width={PROGRESS_RING_SIZE}
        height={PROGRESS_RING_SIZE}
        style={styles.progressRingSvg}
      >
        <Circle
          cx={center}
          cy={center}
          r={PROGRESS_RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={scale(2)}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={PROGRESS_RING_RADIUS}
          fill="none"
          stroke={theme.colors.teal}
          strokeWidth={scale(2)}
          strokeDasharray={PROGRESS_RING_CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={styles.progressRingNumber}>
        {exerciseNumber > 0 ? exerciseNumber : '–'}
      </Text>
    </View>
  );
}

export function ExerciseProgressRingFromExercise({
  currentExercise,
}: {
  currentExercise: PoseExercise;
}) {
  return (
    <ExerciseProgressRing exerciseNumber={exerciseToNumber(currentExercise)} />
  );
}

export function WorkoutTopBar({
  top,
  onBack,
  timerSeconds,
  rightSlot,
  barHeight = WORKOUT_TOP_BAR_HEIGHT,
}: {
  top: number;
  onBack: () => void;
  timerSeconds: number;
  rightSlot: ReactNode;
  barHeight?: number;
}) {
  return (
    <View
      style={[styles.topBar, { top, height: barHeight }]}
      pointerEvents="box-none"
    >
      <WorkoutBackButton onPress={onBack} />
      <View style={styles.timerCenter} pointerEvents="none">
        <WorkoutTimerText seconds={timerSeconds} />
      </View>
      <View style={styles.topBarRight}>{rightSlot}</View>
    </View>
  );
}

export function WorkoutVideoFrame({
  children,
  overlay,
  style,
  frameAreaStyle,
  borderOptions,
  borderRenderer,
}: {
  children: ReactNode;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
  frameAreaStyle?: StyleProp<ViewStyle>;
  borderOptions?: {
    inset?: number;
    borderRadius?: number;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  borderRenderer?: (size: { width: number; height: number }) => ReactNode;
}) {
  const [borderSize, setBorderSize] = useState({ width: 0, height: 0 });

  const handleBorderLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBorderSize({ width, height });
  };

  return (
    <View style={[styles.frameArea, frameAreaStyle, style]}>
      <View style={styles.frameClip}>{children}</View>
      <View
        style={styles.frameBorderOverlay}
        onLayout={handleBorderLayout}
        pointerEvents="none"
      >
        {borderRenderer ? (
          borderRenderer(borderSize)
        ) : (
          <WorkoutTickFrameBorder
            width={borderSize.width}
            height={borderSize.height}
          />
        )}
      </View>
      {overlay ? <View style={styles.frameOverlay}>{overlay}</View> : null}
    </View>
  );
}

export function RepProgressCounter({
  rep,
  totalReps,
}: {
  rep: number;
  totalReps: number;
}) {
  const progress = rep / totalReps;

  return (
    <View style={styles.repCircle}>
      <Svg
        width={REP_RING_SIZE}
        height={REP_RING_SIZE}
        style={styles.repRingSvg}
      >
        <Circle
          cx={REP_RING_CENTER}
          cy={REP_RING_CENTER}
          r={REP_RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={scale(2)}
        />
        <Circle
          cx={REP_RING_CENTER}
          cy={REP_RING_CENTER}
          r={REP_RING_RADIUS}
          fill="none"
          stroke={theme.colors.teal}
          strokeWidth={scale(2)}
          strokeDasharray={REP_RING_CIRCUMFERENCE}
          strokeDashoffset={REP_RING_CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${REP_RING_CENTER} ${REP_RING_CENTER})`}
        />
      </Svg>
      <Text style={styles.repNumber}>{rep}</Text>
    </View>
  );
}

export function RepCounterCircle({ rep }: { rep: number }) {
  return (
    <View style={styles.repCircle}>
      <Text style={styles.repNumber}>{rep}</Text>
    </View>
  );
}

export const workoutBottomPanelStyles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.dark,
    paddingHorizontal: scale(24),
    paddingTop: scale(20),
    paddingBottom: scale(32),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(16),
  },
  titleBlock: {
    flex: 1,
  },
  exerciseName: {
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    color: theme.colors.white,
  },
  currentExerciseLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1),
    color: theme.colors.textSecondary,
    marginTop: scale(2),
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(16),
  },
  statItem: {
    paddingRight: scale(16),
    minHeight: scale(20),
    justifyContent: 'center',
  },
  statItemDivider: {
    paddingLeft: scale(16),
    borderLeftWidth: scale(1),
    borderLeftColor: 'rgba(255,255,255,0.15)',
    minHeight: scale(20),
    justifyContent: 'center',
  },
  statText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(14),
    color: theme.colors.white,
  },
  skipText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(13),
    color: theme.colors.white,
  },
  topBarRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
});

const styles = StyleSheet.create({
  frameArea: {
    flex: 1,
    marginHorizontal: WORKOUT_FRAME_MARGIN,
    marginTop: scale(8),
    position: 'relative',
  },
  frameClip: {
    flex: 1,
    borderRadius: WORKOUT_FRAME_RADIUS,
    overflow: 'hidden',
    backgroundColor: theme.colors.dark,
  },
  frameBorderOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
  },
  frameOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 4,
    borderRadius: WORKOUT_FRAME_RADIUS,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    left: WORKOUT_TOP_BAR_HORIZONTAL,
    right: WORKOUT_TOP_BAR_HORIZONTAL,
    height: WORKOUT_TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    elevation: 20,
  },
  topBarRight: {
    minWidth: scale(34),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleButton: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: scale(0.5),
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: scale(15),
    lineHeight: scale(15),
  },
  timerText: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    color: theme.colors.white,
  },
  progressRing: {
    width: PROGRESS_RING_SIZE,
    height: PROGRESS_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingSvg: {
    position: 'absolute',
  },
  progressRingNumber: {
    color: theme.colors.teal,
    fontSize: scale(17),
    fontFamily: theme.fonts.bodyMedium,
  },
  repCircle: {
    width: REP_RING_SIZE,
    height: REP_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repRingSvg: {
    position: 'absolute',
  },
  repNumber: {
    color: theme.colors.teal,
    fontSize: scale(17),
    fontFamily: theme.fonts.bodyMedium,
  },
});
