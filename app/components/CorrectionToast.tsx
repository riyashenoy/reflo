import { StyleSheet, Text, View } from 'react-native';

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
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  label: {
    fontSize: 14,
    color: '#fff',
  },
});
