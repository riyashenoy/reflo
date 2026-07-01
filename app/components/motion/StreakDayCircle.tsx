import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';
import theme, { scale } from '../../theme';

type StreakDayCircleProps = {
  label: string;
  isCompleted: boolean;
  isToday: boolean;
  index?: number;
};

export function StreakDayCircle({
  label,
  isCompleted,
  isToday,
  index = 0,
}: StreakDayCircleProps) {
  const reduceMotion = useReducedMotion();
  const fill = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      fill.setValue(isCompleted ? 1 : 0);
      checkScale.setValue(isCompleted ? 1 : 0);
      labelOpacity.setValue(1);
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
      labelOpacity.setValue(1);
      return;
    }

    Animated.timing(labelOpacity, {
      toValue: 1,
      duration: motion.duration.normal,
      delay: index * 40,
      easing: motion.easing.out,
      useNativeDriver: true,
    }).start();
  }, [index, labelOpacity, reduceMotion]);

  const backgroundColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.grey200, theme.colors.red],
  });

  return (
    <View style={styles.day}>
      <Animated.Text
        style={[
          styles.label,
          isToday && styles.labelToday,
          { opacity: labelOpacity },
        ]}
      >
        {label}
      </Animated.Text>
      <Animated.View
        style={[
          styles.circle,
          { backgroundColor },
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
    </View>
  );
}

const styles = StyleSheet.create({
  day: {
    alignItems: 'center',
    minWidth: scale(28),
  },
  label: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    color: theme.colors.textSecondary,
    marginBottom: scale(8),
  },
  labelToday: {
    color: theme.colors.red,
  },
  circle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleToday: {
    borderWidth: scale(2),
    borderColor: theme.colors.red,
    backgroundColor: theme.colors.grey200,
  },
  checkmark: {
    color: theme.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
  },
});
