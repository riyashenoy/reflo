import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';
import theme, { scale } from '../../theme';

type AnimatedProgressBarProps = {
  progress: number;
  style?: object;
};

export function AnimatedProgressBar({
  progress,
  style,
}: AnimatedProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: reduceMotion ? 0 : motion.duration.slow,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
  }, [clamped, reduceMotion, width]);

  const fillWidth = width.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, style]}>
      <Animated.View style={[styles.fill, { width: fillWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: scale(4),
    backgroundColor: theme.colors.grey200,
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.red,
    borderRadius: scale(2),
  },
});
