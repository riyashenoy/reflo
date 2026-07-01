import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';

type FadeInViewProps = {
  children: ReactNode;
  delay?: number;
  offsetY?: number;
  style?: StyleProp<ViewStyle>;
  duration?: number;
};

export function FadeInView({
  children,
  delay = 0,
  offsetY = motion.distance.entrance,
  style,
  duration = motion.duration.slow,
}: FadeInViewProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(
    new Animated.Value(reduceMotion ? 0 : offsetY)
  ).current;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, reduceMotion, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
