import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';
import theme, { scale } from '../../theme';

type SegmentPillProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
  activeColor?: string;
  inactiveColor?: string;
};

export function SegmentPill({
  label,
  isActive,
  onPress,
  style,
  textStyle,
  activeTextStyle,
  activeColor = theme.colors.dark,
  inactiveColor = theme.colors.grey200,
}: SegmentPillProps) {
  const reduceMotion = useReducedMotion();
  const activeProgress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: isActive ? 1 : 0,
      duration: reduceMotion ? 0 : motion.duration.normal,
      easing: motion.easing.out,
      useNativeDriver: false,
    }).start();
  }, [activeProgress, isActive, reduceMotion]);

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveColor, activeColor],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) {
          Animated.spring(pressScale, {
            toValue: motion.pressScale,
            ...motion.spring.press,
          }).start();
        }
      }}
      onPressOut={() => {
        if (!reduceMotion) {
          Animated.spring(pressScale, {
            toValue: 1,
            ...motion.spring.release,
          }).start();
        }
      }}
    >
      <Animated.View
        style={[
          styles.pill,
          style,
          { backgroundColor, transform: [{ scale: pressScale }] },
        ]}
      >
        <Text
          style={[
            styles.text,
            textStyle,
            isActive && styles.textActive,
            isActive && activeTextStyle,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function SegmentPillLight({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeProgress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: isActive ? 1 : 0,
      duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [activeProgress, isActive, reduceMotion]);

  const backgroundColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', theme.colors.white],
  });

  const borderColor = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', theme.colors.border],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) {
          Animated.spring(pressScale, {
            toValue: 0.96,
            ...motion.spring.press,
          }).start();
        }
      }}
      onPressOut={() => {
        if (!reduceMotion) {
          Animated.spring(pressScale, {
            toValue: 1,
            ...motion.spring.release,
          }).start();
        }
      }}
    >
      <Animated.View
        style={[
          styles.lightPill,
          {
            backgroundColor,
            borderColor,
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        <Text
          style={[
            styles.lightText,
            isActive && styles.lightTextActive,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: scale(18),
    paddingVertical: scale(10),
    borderRadius: theme.radius.full,
  },
  text: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  textActive: {
    color: theme.colors.white,
  },
  lightPill: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: theme.radius.full,
    borderWidth: scale(1),
  },
  lightText: {
    ...theme.typography.body,
    fontSize: scale(11),
    color: theme.colors.textSecondary,
  },
  lightTextActive: {
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
