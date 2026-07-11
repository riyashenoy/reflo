import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motion } from '../../lib/motion';

type FadeSlideOverlayProps = {
  visible: boolean;
  children: ReactNode;
  /** Backdrop behind the card. Defaults to a heavy dim. */
  backdropColor?: string;
};

export function FadeSlideOverlay({
  visible,
  children,
  backdropColor = '#000000cc',
}: FadeSlideOverlayProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const translateY = useRef(
    new Animated.Value(visible ? 0 : motion.distance.modal)
  ).current;
  const cardScale = useRef(new Animated.Value(visible ? 1 : 0.98)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(visible ? 1 : 0);
      translateY.setValue(0);
      cardScale.setValue(1);
      return;
    }

    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.duration.normal,
          easing: motion.easing.out,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.duration.slow,
          easing: motion.easing.out,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          ...motion.spring.gentle,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.duration.fast,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: motion.distance.modal,
        duration: motion.duration.fast,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, opacity, reduceMotion, translateY, visible]);

  if (!visible && reduceMotion) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.overlay, { opacity, backgroundColor: backdropColor }]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <Animated.View
        pointerEvents="auto"
        style={{
          transform: [{ translateY }, { scale: cardScale }],
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
});
