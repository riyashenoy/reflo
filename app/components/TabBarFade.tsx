import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { TAB_BAR_FADE_HEIGHT } from '../lib/tabBarMetrics';
import theme from '../theme';

type TabBarFadeProps = {
  height?: number;
};

const FADE_COLORS = [
  'rgba(243,243,243,0)',
  'rgba(243,243,243,0.12)',
  'rgba(243,243,243,0.32)',
  'rgba(243,243,243,0.58)',
  'rgba(243,243,243,0.82)',
  theme.colors.background,
] as const;

const FADE_LOCATIONS = [0, 0.22, 0.42, 0.62, 0.82, 1] as const;

export default function TabBarFade({
  height = TAB_BAR_FADE_HEIGHT,
}: TabBarFadeProps) {
  return (
    <LinearGradient
      colors={[...FADE_COLORS]}
      locations={[...FADE_LOCATIONS]}
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
