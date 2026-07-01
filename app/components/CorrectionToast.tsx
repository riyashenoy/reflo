import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { motion } from '../lib/motion';
import theme, { scale } from '../theme';

type Props = {
  message: string | null;
  onDismiss?: () => void;
};

const VISIBLE_MS = 3000;
const FADE_MS = motion.duration.normal;

export default function CorrectionToast({ message, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (!message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisibleMessage(null);
      });
      return;
    }

    setVisibleMessage(message);
    translateY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: FADE_MS,
        easing: motion.easing.out,
        useNativeDriver: true,
      }),
    ]).start();

    dismissTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 8,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisibleMessage(null);
        onDismiss?.();
      });
    }, VISIBLE_MS);
  }, [message, onDismiss, opacity, translateY]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  if (!visibleMessage) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{visibleMessage}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: scale(16),
    right: scale(16),
    bottom: scale(140),
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.md,
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    zIndex: 4,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontSize: scale(14),
    lineHeight: scale(20),
  },
});
