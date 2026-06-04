import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../navigation';

type Props = NativeStackScreenProps<AppStackParamList, 'ClassDetail'>;

export default function ClassDetail({ route }: Props) {
  const { workoutId } = route.params ?? {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ClassDetail</Text>
      {workoutId ? <Text style={styles.subtitle}>workoutId: {workoutId}</Text> : null}
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
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
});
