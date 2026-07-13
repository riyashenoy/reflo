import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
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

import { PressableScale } from '../components/motion';
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
      <Text style={styles.eyebrow}>REFLO</Text>
      <Text style={styles.title}>Welcome back.</Text>
      <Text style={styles.subtitle}>
        Sign in to start your personalized pilates training.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.red} />
      ) : (
        <View style={styles.buttons}>
          <PressableScale style={styles.primaryButton} onPress={handleGoogleSignIn}>
            <Text style={styles.primaryButtonText}>Continue with Google</Text>
          </PressableScale>
          <PressableScale
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('EmailAuth')}
          >
            <Text style={styles.secondaryButtonText}>Continue with Email</Text>
          </PressableScale>
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
    width: scale(64),
    height: scale(32),
    resizeMode: 'contain',
    alignSelf: 'flex-start',
    marginBottom: scale(28),
  },
  eyebrow: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.6),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: scale(6),
  },
  title: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
    marginBottom: scale(8),
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    lineHeight: scale(20),
    color: theme.colors.textMuted,
    marginBottom: scale(32),
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.red,
    marginBottom: scale(16),
  },
  buttons: {
    gap: scale(10),
  },
  primaryButton: {
    backgroundColor: theme.colors.dark,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.textPrimary,
  },
});
