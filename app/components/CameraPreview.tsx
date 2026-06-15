import { useEffect } from 'react';
import {
  Button,
  Linking,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import theme from '../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export default function CameraPreview({ style }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  if (!permission) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.placeholder, style]}>
        <Text style={styles.text}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.permissionContainer, style]}>
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

  return (
    <CameraView style={[StyleSheet.absoluteFill, style]} facing="back" />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionContainer: {
    backgroundColor: theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  spacer: {
    marginTop: 12,
  },
});
