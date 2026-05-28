import { StyleSheet, Text, View } from 'react-native';

export default function ClassDetail() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ClassDetail</Text>
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
