import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

const inset = 12;

const webBorderStyle: ViewStyle =
  Platform.OS === 'web'
    ? ({
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(204, 34, 0, 0.7)',
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
    borderColor: '#cc2200',
    opacity: 0.7,
    zIndex: 2,
    ...(Platform.OS === 'ios' || Platform.OS === 'android'
      ? { borderStyle: 'dashed' }
      : {}),
  },
});
