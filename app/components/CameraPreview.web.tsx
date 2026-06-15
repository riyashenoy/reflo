import { createElement, useEffect, useRef, useState } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import theme from '../theme';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export default function CameraPreview({ style }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('Camera access is required for live workouts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      stopStream();
    };
  }, []);

  if (loading) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.placeholder, style]}>
        <Text style={styles.text}>Starting camera…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[StyleSheet.absoluteFill, styles.permissionContainer, style]}
      >
        <Text style={styles.text}>{error}</Text>
        <Button title="Grant Permission" onPress={startCamera} />
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.videoContainer, style]}>
      {createElement('video', {
        ref: (node: HTMLVideoElement | null) => {
          videoRef.current = node;
        },
        autoPlay: true,
        playsInline: true,
        muted: true,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      })}
    </View>
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
  videoContainer: {
    overflow: 'hidden',
    backgroundColor: theme.colors.dark,
  },
  text: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
});
