import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';
import theme, { scale } from '../../theme';

type StreakDayCircleProps = {
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  index?: number;
};

export function StreakDayCircle({
  label,
  isCompleted,
  isToday,
  isFuture,
  index = 0,
}: StreakDayCircleProps) {
  const reduceMotion = useReducedMotion();
  const fill = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fill.setValue(isCompleted ? 1 : 0);
      checkScale.setValue(isCompleted ? 1 : 0);
      opacity.setValue(1);
      return;
    }

    Animated.timing(fill, {
      toValue: isCompleted ? 1 : 0,
      duration: motion.duration.normal,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();

    if (isCompleted) {
      Animated.spring(checkScale, {
        toValue: 1,
        ...motion.spring.gentle,
      }).start();
    } else {
      checkScale.setValue(0);
    }
  }, [checkScale, fill, isCompleted, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }

    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.duration.normal,
      delay: index * 40,
      easing: motion.easing.out,
      useNativeDriver: true,
    }).start();
  }, [index, opacity, reduceMotion]);

  const backgroundColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isToday ? theme.colors.white : theme.colors.grey200,
      theme.colors.red,
    ],
  });

  const circleOpacity = isFuture && !isCompleted && !isToday ? 0.4 : 1;

  return (
    <Animated.View style={[styles.day, { opacity }]}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor, opacity: circleOpacity },
          isToday && !isCompleted && styles.circleToday,
        ]}
      >
        {isCompleted ? (
          <Animated.Text
            style={[styles.checkmark, { transform: [{ scale: checkScale }] }]}
          >
            ✓
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const CIRCLE_SIZE = scale(30);

const styles = StyleSheet.create({
  day: {
    alignItems: 'center',
    minWidth: scale(28),
  },
  label: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.grey400,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleToday: {
    borderWidth: scale(2),
    borderColor: theme.colors.red,
    backgroundColor: theme.colors.white,
  },
  checkmark: {
    color: theme.colors.white,
    fontSize: scale(10),
    fontWeight: '700',
  },
});
