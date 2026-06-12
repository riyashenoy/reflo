import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import theme from '../theme';

const inset = 12;

const webBorderStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: `${theme.colors.red}b3`,
      } as ViewStyle)
    : {};

export default function DashedBorderOverlay() {
  return <View style={[styles.dashedBorder, webBorderStyle]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  dashedBorder: {
    position: 'absolute',
    top: inset,
    right: inset,
    bottom: inset,
    left: inset,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.red,
    opacity: 0.7,
    zIndex: 2,
    ...(Platform.OS === 'ios' || Platform.OS === 'android'
      ? { borderStyle: 'dashed' }
      : {}),
  },
});
