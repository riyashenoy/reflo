import { StyleSheet, View } from 'react-native';

import theme, { scale } from '../theme';

type TabBarFadeProps = {
  height?: number;
};

const FADE_HEIGHT = scale(100);

export default function TabBarFade({ height = FADE_HEIGHT }: TabBarFadeProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.fade,
        {
          height,
          backgroundImage: `linear-gradient(to bottom, transparent, rgba(243,243,243,0.85), ${theme.colors.background})`,
        } as object,
      ]}
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
