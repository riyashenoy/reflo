import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PushupLogo from '../components/PushupLogo';
import { PressableScale } from '../components/motion';
import { auth } from '../lib/firebase';
import { fetchGeneratedWorkout } from '../lib/generatePlan';
import { requestGeneratedVoice } from '../lib/generateVoice';
import {
  getVoiceQuota,
  incrementVoiceQuotaOnSuccess,
  VOICE_GENERATIONS_PER_WEEK,
} from '../lib/voiceQuota';
import { peekVoiceSession } from '../lib/voiceSessionCache';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'PrepareSession'>;

const STATUS_LINES = [
  'Composing your cues…',
  'Warming up the voice…',
  'Almost ready…',
] as const;

const STATUS_MS = 2800;
const FLAGSHIP_WORKOUT_ID = 'full-body-burn';

type GateState =
  | { kind: 'loading' }
  | { kind: 'quota' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

export default function PrepareSession({ route, navigation }: Props) {
  const { generatedSlug, dateKey } = route.params;
  const insets = useSafeAreaInsets();

  const [gate, setGate] = useState<GateState>({ kind: 'loading' });
  const [statusIndex, setStatusIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0.35)).current;
  const runIdRef = useRef(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (gate.kind !== 'loading') {
      return;
    }
    const id = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUS_LINES.length);
    }, STATUS_MS);
    return () => clearInterval(id);
  }, [gate.kind]);

  const prepare = useCallback(async () => {
    const runId = ++runIdRef.current;
    setGate({ kind: 'loading' });
    setStatusIndex(0);

    // Already prepared this session — skip re-TTS / quota.
    if (peekVoiceSession(generatedSlug)?.clips.length) {
      navigation.replace('LiveWorkout', {
        generatedSlug,
        dateKey,
      });
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setGate({
        kind: 'error',
        message: 'Sign in to start a generated class.',
      });
      return;
    }

    try {
      const quota = await getVoiceQuota(uid);
      if (runId !== runIdRef.current) {
        return;
      }

      if (!quota.allowed) {
        setGate({ kind: 'quota' });
        return;
      }

      const workout = await fetchGeneratedWorkout(uid, generatedSlug);
      if (runId !== runIdRef.current) {
        return;
      }

      if (!workout || workout.exercises.length === 0) {
        setGate({
          kind: 'error',
          message:
            "Couldn't prepare this session — try again or start your flagship class.",
        });
        return;
      }

      const voice = await requestGeneratedVoice(workout);
      if (runId !== runIdRef.current) {
        return;
      }

      if (!voice.ok) {
        setGate({
          kind: 'error',
          message:
            "Couldn't prepare this session — try again or start your flagship class.",
        });
        return;
      }

      // Meter only on success — failures never increment.
      try {
        await incrementVoiceQuotaOnSuccess(uid);
      } catch (error) {
        console.warn('[PrepareSession] quota increment failed:', error);
        // Voice already generated; continue into the session.
      }

      if (runId !== runIdRef.current) {
        return;
      }

      navigation.replace('LiveWorkout', {
        generatedSlug,
        dateKey,
      });
    } catch (error) {
      console.warn('[PrepareSession] prepare failed:', error);
      if (runId !== runIdRef.current) {
        return;
      }
      setGate({
        kind: 'error',
        message:
          "Couldn't prepare this session — try again or start your flagship class.",
      });
    }
  }, [dateKey, generatedSlug, navigation]);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  const goFlagship = () => {
    navigation.replace('ClassDetail', {
      workoutId: FLAGSHIP_WORKOUT_ID,
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + scale(24) }]}>
      <PressableScale
        style={styles.backHit}
        onPress={() => navigation.goBack()}
        hitSlop={12}
      >
        <Text style={styles.backText}>←</Text>
      </PressableScale>

      <View style={styles.center}>
        <PushupLogo width={scale(96)} />

        <Text style={styles.heading}>Preparing your session</Text>

        {gate.kind === 'loading' ? (
          <>
            <View style={styles.pulseTrack}>
              <Animated.View
                style={[
                  styles.pulseFill,
                  {
                    opacity: pulse,
                    transform: [
                      {
                        scaleX: pulse.interpolate({
                          inputRange: [0.35, 1],
                          outputRange: [0.35, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <Text style={styles.status}>{STATUS_LINES[statusIndex]}</Text>
          </>
        ) : null}

        {gate.kind === 'quota' ? (
          <View style={styles.messageBlock}>
            <Text style={styles.messageBody}>
              You&apos;ve used your generated workouts this week. Your flagship
              class is always available.
            </Text>
            <Text style={styles.quotaMeta}>
              {VOICE_GENERATIONS_PER_WEEK} generated sessions · resets weekly
            </Text>
            <PressableScale style={styles.primaryButton} onPress={goFlagship}>
              <Text style={styles.primaryButtonText}>OPEN FLAGSHIP CLASS</Text>
            </PressableScale>
            <PressableScale style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>GO BACK</Text>
            </PressableScale>
          </View>
        ) : null}

        {gate.kind === 'error' ? (
          <View style={styles.messageBlock}>
            <Text style={styles.messageBody}>{gate.message}</Text>
            <PressableScale style={styles.primaryButton} onPress={() => void prepare()}>
              <Text style={styles.primaryButtonText}>TRY AGAIN</Text>
            </PressableScale>
            <PressableScale style={styles.secondaryButton} onPress={goFlagship}>
              <Text style={styles.secondaryButtonText}>START FLAGSHIP CLASS</Text>
            </PressableScale>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: scale(28),
  },
  backHit: {
    alignSelf: 'flex-start',
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
  },
  backText: {
    color: theme.colors.textPrimary,
    fontSize: scale(20),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: scale(80),
    gap: scale(16),
  },
  heading: {
    fontFamily: theme.fonts.header,
    fontSize: scale(26),
    letterSpacing: scale(-0.6),
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: scale(8),
  },
  pulseTrack: {
    width: scale(120),
    height: scale(3),
    backgroundColor: theme.colors.grey200,
    borderRadius: scale(2),
    overflow: 'hidden',
    marginTop: scale(8),
  },
  pulseFill: {
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.teal,
    borderRadius: scale(2),
  },
  status: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: scale(4),
    minHeight: scale(16),
  },
  messageBlock: {
    width: '100%',
    maxWidth: scale(320),
    alignItems: 'center',
    gap: scale(14),
    marginTop: scale(8),
  },
  messageBody: {
    fontFamily: theme.fonts.body,
    fontSize: scale(14),
    lineHeight: scale(21),
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  quotaMeta: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.2),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: theme.colors.red,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(8),
  },
  primaryButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.4),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    width: '100%',
    borderRadius: scale(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.4),
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
  },
});
