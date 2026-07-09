import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import theme, { scale } from '../theme';

type TabBarFadeProps = {
  height?: number;
};

const FADE_COLORS = [
  'transparent',
  'rgba(243,243,243,0.85)',
  theme.colors.background,
] as const;

const FADE_HEIGHT = scale(100);

export default function TabBarFade({ height = FADE_HEIGHT }: TabBarFadeProps) {
  return (
    <LinearGradient
      colors={[...FADE_COLORS]}
      style={[styles.fade, { height }]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 1,
  },
});
