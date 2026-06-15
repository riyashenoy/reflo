import { StyleSheet, Text, View } from 'react-native';

import theme, { scale } from '../theme';

export default function RepCounter() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>RepCounter</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(16),
  },
});
