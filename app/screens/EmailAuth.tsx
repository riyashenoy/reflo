import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuthFlow } from '../context/AuthFlowContext';
import { auth } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import type { AuthStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailAuth'>;

export default function EmailAuth({ navigation }: Props) {
  const { setAppEntryRoute } = useAuthFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setAppEntryRoute('Main');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      setAppEntryRoute('ProfileSetup');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.title}>Email sign in.</Text>
      <Text style={styles.subtitle}>
        Sign in to your account or create a new one.
      </Text>

      <Text style={styles.fieldLabel}>EMAIL</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor={theme.colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!loading}
      />

      <Text style={styles.fieldLabel}>PASSWORD</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        editable={!loading}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.red} />
      ) : (
        <View style={styles.buttons}>
          <Pressable style={styles.primaryButton} onPress={handleSignIn}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleSignUp}>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </Pressable>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
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
    marginBottom: scale(28),
  },
  fieldLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    marginBottom: scale(8),
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    padding: scale(14),
    marginBottom: scale(16),
    fontFamily: theme.fonts.body,
    fontSize: scale(15),
    color: theme.colors.textPrimary,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.red,
    marginBottom: scale(16),
  },
  buttons: {
    gap: scale(10),
    marginTop: scale(8),
  },
  primaryButton: {
    backgroundColor: theme.colors.dark,
    borderRadius: scale(4),
    paddingVertical: scale(14),
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
    backgroundColor: theme.colors.red,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
  backButton: {
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  backButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
});
