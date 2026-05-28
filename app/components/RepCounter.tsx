import { StyleSheet, Text, View } from 'react-native';

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
    fontSize: 16,
    fontWeight: '600',
  },
});
