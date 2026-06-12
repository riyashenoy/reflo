import { StyleSheet, Text, View } from 'react-native';

import theme from '../theme';

export default function CorrectionToast() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>CorrectionToast</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dark,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
});
