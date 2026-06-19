import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

type TabBarFadeProps = {
  height: number;
};

const FADE_COLORS = [
  'transparent',
  'rgba(243,243,243,0.7)',
  'rgba(243,243,243,0.95)',
] as const;

export default function TabBarFade({ height }: TabBarFadeProps) {
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
    zIndex: 0,
  },
});
