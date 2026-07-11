import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { FormScorePoint } from '../lib/progressStats';
import theme, { scale } from '../theme';

type FormScoreChartProps = {
  points: FormScorePoint[];
  width: number;
  height?: number;
};

export function FormScoreChart({
  points,
  width,
  height = scale(180),
}: FormScoreChartProps) {
  const chart = useMemo(() => {
    const padding = {
      top: scale(16),
      right: scale(12),
      bottom: scale(28),
      left: scale(28),
    };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const minScore = 60;
    const maxScore = 100;

    const coords = points.map((point, index) => {
      const x =
        padding.left +
        (points.length === 1
          ? innerWidth / 2
          : (index / (points.length - 1)) * innerWidth);
      const normalized = (point.score - minScore) / (maxScore - minScore);
      const y = padding.top + innerHeight - normalized * innerHeight;
      return { ...point, x, y };
    });

    const linePath = coords
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const areaPath = coords.length
      ? `${linePath} L ${coords[coords.length - 1].x} ${
          padding.top + innerHeight
        } L ${coords[0].x} ${padding.top + innerHeight} Z`
      : '';

    return { coords, linePath, areaPath, padding, innerHeight, minScore, maxScore };
  }, [height, points, width]);

  if (!points.length) {
    return null;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.teal} stopOpacity="0.35" />
            <Stop offset="1" stopColor={theme.colors.teal} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = chart.padding.top + chart.innerHeight * (1 - ratio);
          const score = Math.round(chart.minScore + (chart.maxScore - chart.minScore) * ratio);
          return (
            <SvgText
              key={score}
              x={scale(4)}
              y={y + scale(4)}
              fill={theme.colors.textSecondary}
              fontSize={scale(9)}
            >
              {score}
            </SvgText>
          );
        })}

        {chart.areaPath ? (
          <Path d={chart.areaPath} fill="url(#scoreFill)" />
        ) : null}
        {chart.linePath ? (
          <Path
            d={chart.linePath}
            stroke={theme.colors.teal}
            strokeWidth={scale(2.5)}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {chart.coords.map((point) => (
          <Circle
            key={point.dateKey}
            cx={point.x}
            cy={point.y}
            r={scale(4)}
            fill={theme.colors.white}
            stroke={theme.colors.teal}
            strokeWidth={scale(2)}
          />
        ))}

        {chart.coords.map((point) => (
          <SvgText
            key={`${point.dateKey}-label`}
            x={point.x}
            y={height - scale(8)}
            fill={theme.colors.textSecondary}
            fontSize={scale(9)}
            textAnchor="middle"
          >
            {point.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export function ProgressEmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>
        Keep using reflo and your form scores, streak, and session stats will
        show up here after you complete workouts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  emptyState: {
    paddingTop: scale(4),
    paddingBottom: scale(8),
  },
  emptyText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    lineHeight: scale(20),
    color: theme.colors.textMuted,
  },
});
