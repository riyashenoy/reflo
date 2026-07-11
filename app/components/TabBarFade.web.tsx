import { StyleSheet, View } from 'react-native';

import { TAB_BAR_FADE_HEIGHT } from '../lib/tabBarMetrics';
import theme from '../theme';

type TabBarFadeProps = {
  height?: number;
};

export default function TabBarFade({
  height = TAB_BAR_FADE_HEIGHT,
}: TabBarFadeProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.fade,
        {
          height,
          backgroundImage: `linear-gradient(to bottom, rgba(243,243,243,0) 0%, rgba(243,243,243,0.12) 22%, rgba(243,243,243,0.32) 42%, rgba(243,243,243,0.58) 62%, rgba(243,243,243,0.82) 82%, ${theme.colors.background} 100%)`,
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
