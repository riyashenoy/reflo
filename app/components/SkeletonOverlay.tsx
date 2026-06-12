import { StyleSheet, Text, View } from 'react-native';

import theme from '../theme';

export default function SkeletonOverlay() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>SkeletonOverlay</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
});
