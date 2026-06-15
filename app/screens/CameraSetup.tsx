import { StyleSheet, Text, View } from 'react-native';

import theme, { scale } from '../theme';

export default function CameraSetup() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Setup</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
  },
});
