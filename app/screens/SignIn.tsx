import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
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

import { useAuthFlow } from '../context/AuthFlowContext';
import { auth, googleProvider } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import type { AuthStackParamList } from '../navigation';

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SignIn</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.buttons}>
          <Button title="Continue with Google" onPress={handleGoogleSignIn} />
          <Button
            title="Continue with Email"
            onPress={() => navigation.navigate('EmailAuth')}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttons: {
    gap: 8,
  },
});
