import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import theme, { scale } from '../../theme';

type SkeletonBlockProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({
  width = '100%',
  height = scale(16),
  borderRadius = theme.radius.sm,
  style,
}: SkeletonBlockProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          opacity: reduceMotion ? 0.55 : pulse,
        },
        style,
      ]}
    />
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileHeader}>
      <SkeletonBlock width={scale(80)} height={scale(80)} borderRadius={scale(40)} />
      <View style={styles.profileText}>
        <SkeletonBlock width="55%" height={scale(22)} />
        <SkeletonBlock
          width="40%"
          height={scale(14)}
          style={styles.profileSubtitle}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: theme.colors.grey200,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(24),
  },
  profileText: {
    flex: 1,
    marginLeft: scale(14),
    gap: scale(8),
  },
  profileSubtitle: {
    marginTop: scale(8),
  },
});
