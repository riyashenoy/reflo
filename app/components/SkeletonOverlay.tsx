import { StyleSheet, Text, View } from 'react-native';

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
    fontSize: 16,
    color: '#fff',
  },
});
