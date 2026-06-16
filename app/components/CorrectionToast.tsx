import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import theme, { scale } from '../theme';

type Props = {
  message: string | null;
  onDismiss?: () => void;
};

const VISIBLE_MS = 3000;
const FADE_MS = 300;

export default function CorrectionToast({ message, onDismiss }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (!message) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setVisibleMessage(null);
      });
      return;
    }

    setVisibleMessage(message);
    opacity.setValue(1);

    dismissTimerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setVisibleMessage(null);
        onDismiss?.();
      });
    }, VISIBLE_MS);
  }, [message, onDismiss, opacity]);

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
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
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
