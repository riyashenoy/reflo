import { StyleSheet, Text, View } from 'react-native';

export default function WorkoutCard() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>WorkoutCard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
