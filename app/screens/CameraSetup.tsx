import { StyleSheet, Text, View } from 'react-native';

export default function CameraSetup() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CameraSetup</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
