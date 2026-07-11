import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';
import { motion } from '../lib/motion';
import theme, { scale } from '../theme';

type ThemeToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

export function ThemeToggle({
  value,
  onValueChange,
  disabled = false,
}: ThemeToggleProps) {
  const reduceMotion = useReducedMotion();
  const trackWidth = theme.component.toggleTrackWidth;
  const trackHeight = theme.component.toggleTrackHeight;
  const thumbSize = theme.component.toggleThumbSize;
  const thumbInset = scale(3);
  const travel = trackWidth - thumbSize - thumbInset * 2;

  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(value ? 1 : 0);
      return;
    }

    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: motion.duration.normal,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
  }, [progress, reduceMotion, value]);

  const thumbTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [thumbInset, thumbInset + travel],
  });

  const trackColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.grey200, theme.colors.teal],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={6}
    >
      <Animated.View
        style={{
          width: trackWidth,
          height: trackHeight,
          borderRadius: trackHeight / 2,
          justifyContent: 'center',
          backgroundColor: trackColor,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Animated.View
          style={{
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: theme.colors.white,
            transform: [{ translateX: thumbTranslateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
