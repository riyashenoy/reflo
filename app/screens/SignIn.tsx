import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthFlow } from '../context/AuthFlowContext';
import { auth, googleProvider } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import type { AuthStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export default function SignIn({ navigation }: Props) {
  const { setAppEntryRoute } = useAuthFlow();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setCheckingSession(false);
    });

    return unsubscribe;
  }, []);

  const handleGoogleSignIn = async () => {
    if (Platform.OS !== 'web') {
      setError('Google sign-in requires the web app. Use email sign-in on mobile.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser ?? false;
      setAppEntryRoute(isNewUser ? 'ProfileSetup' : 'Main');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.red} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Welcome to Reflo</Text>
      <Text style={styles.subtitle}>
        Sign in to start your personalized pilates training
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.red} />
      ) : (
        <View style={styles.buttons}>
          <Pressable style={styles.primaryButton} onPress={handleGoogleSignIn}>
            <Text style={styles.primaryButtonText}>Continue with Google</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('EmailAuth')}
          >
            <Text style={styles.secondaryButtonText}>Continue with Email</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: scale(24),
    backgroundColor: theme.colors.background,
  },
  logo: {
    width: scale(96),
    height: scale(48),
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: scale(32),
  },
  title: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: scale(32),
    lineHeight: 20,
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.red,
    marginBottom: scale(16),
    textAlign: 'center',
  },
  buttons: {
    gap: scale(12),
  },
  primaryButton: {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.full,
    paddingVertical: scale(16),
    alignItems: 'center',
  },
  primaryButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.full,
    paddingVertical: scale(16),
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textPrimary,
  },
});
