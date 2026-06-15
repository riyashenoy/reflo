import { useEffect } from 'react';
import {
  Button,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import theme, { scale } from '../theme';

export default function LiveWorkoutNativeCamera() {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  if (!permission) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
        <Text style={styles.text}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.permissionContainer]}>
        <Text style={styles.text}>
          Camera access is required for live workouts.
        </Text>
        <Button
          title="Open Settings"
          onPress={() => Linking.openSettings()}
        />
        {!permission.canAskAgain ? null : (
          <View style={styles.spacer}>
            <Button title="Grant Permission" onPress={requestPermission} />
          </View>
        )}
      </View>
    );
  }

  return <CameraView style={StyleSheet.absoluteFill} facing="back" />;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  permissionContainer: {
    backgroundColor: theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(24),
  },
  text: {
    ...theme.typography.body,
    fontSize: scale(16),
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: scale(16),
  },
  spacer: {
    marginTop: scale(12),
  },
});
