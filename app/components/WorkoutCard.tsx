import { StyleSheet, Text, View } from 'react-native';

import theme, { scale } from '../theme';

export default function WorkoutCard() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>WorkoutCard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: scale(16),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.grey200,
  },
  label: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textPrimary,
  },
});
