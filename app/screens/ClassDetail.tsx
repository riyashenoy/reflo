import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FadeInView, PressableScale } from '../components/motion';
import VoiceModeTag from '../components/VoiceModeTag';
import { getWorkoutById, type Intensity } from '../data/workouts';
import {
  DEMO_WORKOUT_ID,
  getLibraryWorkoutForDemo,
} from '../data/workoutLibrary';
import { useSavedWorkouts } from '../context/SavedWorkoutsContext';
import { auth } from '../lib/firebase';
import {
  fetchGeneratedWorkout,
  type GeneratedWorkoutDoc,
  type ResolvedGeneratedExercise,
} from '../lib/generatePlan';
import { peekVoiceSession } from '../lib/voiceSessionCache';
import { toDateKey } from '../lib/workoutHistory';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ClassDetail'>;

const HORIZONTAL_PADDING = scale(20);
const HERO_HEIGHT_RATIO = 0.34;
const RULE = 'rgba(255,255,255,0.12)';
const MUTED = 'rgba(255,255,255,0.55)';

function formatIntensity(intensity: Intensity | string) {
  if (intensity === 'medium') {
    return 'Med';
  }
  if (intensity === 'high') {
    return 'High';
  }
  return 'Low';
}

function formatExerciseMeta(
  sets: number,
  reps: number,
  repType?: 'count' | 'seconds',
  meta?: string
) {
  if (meta) {
    return meta;
  }
  if (repType === 'seconds') {
    return `${sets > 1 ? `${sets} × ` : ''}${reps}s hold`;
  }
  if (sets === 1 && reps >= 50) {
    return `${sets} set · ${reps} counts`;
  }
  return `${sets} sets · ${reps} reps`;
}

function difficultyDots(level: GeneratedWorkoutDoc['intensity'] | number): number {
  if (typeof level === 'number') {
    return level;
  }
  if (level === 'high') {
    return 3;
  }
  if (level === 'low') {
    return 1;
  }
  return 2;
}

type DisplayExercise = {
  name: string;
  sets: number;
  reps: number;
  repType?: 'count' | 'seconds';
  springSetting?: string;
  tracked: boolean;
  meta?: string;
  cue?: string;
};

type DisplayWorkout = {
  id: string;
  title: string;
  description: string;
  duration: number;
  intensity: Intensity | string;
  voiceMode: 'recorded' | 'generated';
  aiTracked: boolean;
  exercises: DisplayExercise[];
  isGenerated: boolean;
  focus?: string;
};

export default function ClassDetail({ route, navigation }: Props) {
  const {
    libraryId,
    workoutId: routeWorkoutId,
    generatedSlug,
  } = route.params ?? {};
  const { isSaved, toggleSaved } = useSavedWorkouts();
  const insets = useSafeAreaInsets();
  const heroHeight = Dimensions.get('window').height * HERO_HEIGHT_RATIO;

  const [generated, setGenerated] = useState<GeneratedWorkoutDoc | null>(null);
  const [loadingGenerated, setLoadingGenerated] = useState(Boolean(generatedSlug));
  /** True when TTS clips for this slug are already in the session cache. */
  const [voiceReady, setVoiceReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!generatedSlug) {
        setVoiceReady(false);
        return;
      }
      const session = peekVoiceSession(generatedSlug);
      setVoiceReady(Boolean(session && session.clips.length > 0));
    }, [generatedSlug])
  );

  useEffect(() => {
    let cancelled = false;

    async function loadGenerated() {
      if (!generatedSlug) {
        setLoadingGenerated(false);
        return;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoadingGenerated(false);
        return;
      }
      setLoadingGenerated(true);
      try {
        const docData = await fetchGeneratedWorkout(uid, generatedSlug);
        if (!cancelled) {
          setGenerated(docData);
        }
      } catch (error) {
        console.warn('[ClassDetail] generated load failed:', error);
        if (!cancelled) {
          setGenerated(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingGenerated(false);
        }
      }
    }

    void loadGenerated();
    return () => {
      cancelled = true;
    };
  }, [generatedSlug]);

  const libraryWorkout = generatedSlug
    ? undefined
    : getLibraryWorkoutForDemo(libraryId, routeWorkoutId);
  const staticWorkout = generatedSlug
    ? undefined
    : getWorkoutById(
        libraryWorkout?.workoutId ?? routeWorkoutId ?? DEMO_WORKOUT_ID
      );

  const display: DisplayWorkout | null = generated
    ? {
        id: generated.slug,
        title: generated.title.trim(),
        description: generated.focus
          ? `FOCUS · ${generated.focus.replace(/-/g, ' ').toUpperCase()}`
          : '',
        duration: generated.estimatedDuration,
        intensity: generated.intensity,
        voiceMode: 'generated',
        aiTracked: generated.exercises.some((ex) => ex.tracked),
        isGenerated: true,
        focus: generated.focus,
        exercises: generated.exercises.map((ex: ResolvedGeneratedExercise) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          repType: ex.repType,
          springSetting: ex.springSetting,
          tracked: ex.tracked,
          cue: ex.cue,
        })),
      }
    : staticWorkout
      ? {
          id: staticWorkout.id,
          title: libraryWorkout?.title ?? staticWorkout.title,
          description:
            libraryWorkout?.description ?? staticWorkout.description ?? '',
          duration: staticWorkout.duration,
          intensity: staticWorkout.intensity,
          voiceMode: staticWorkout.voiceMode,
          aiTracked: staticWorkout.aiTracked,
          isGenerated: false,
          exercises: staticWorkout.exercises.map((ex) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            tracked: ex.tracked,
            meta: ex.meta,
            cue: ex.cue,
          })),
        }
      : null;

  const bookmarkId = libraryWorkout?.id ?? routeWorkoutId;
  const saved = bookmarkId ? isSaved(bookmarkId) : false;
  const difficulty = libraryWorkout?.difficulty
    ?? difficultyDots(
      (display?.intensity as GeneratedWorkoutDoc['intensity']) ?? 'medium'
    );

  if (loadingGenerated) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.teal} />
          <Text style={styles.loadingText}>Loading class…</Text>
        </View>
      </View>
    );
  }

  if (!display) {
    return (
      <View style={styles.container}>
        <PressableScale
          style={[styles.iconButton, { top: insets.top + scale(12), left: scale(20) }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.iconButtonText}>←</Text>
        </PressableScale>
        <Text style={styles.notFound}>Workout not found</Text>
      </View>
    );
  }

  const stats = [
    {
      value: String(display.duration),
      label: 'MIN',
    },
    {
      value: formatIntensity(display.intensity),
      label: 'LEVEL',
    },
    {
      value: String(display.exercises.length),
      label: 'MOVES',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          {libraryWorkout ? (
            <Image
              source={libraryWorkout.coverImage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder} />
          )}
          <View
            style={[
              styles.heroGradient,
              Platform.OS === 'web'
                ? ({
                    backgroundImage:
                      'linear-gradient(to bottom, rgba(36,33,33,0) 0%, rgba(36,33,33,0.55) 55%, #242121 100%)',
                  } as object)
                : null,
            ]}
          />
          <PressableScale
            style={[styles.iconButton, { top: insets.top + scale(12), left: scale(20) }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.iconButtonText}>←</Text>
          </PressableScale>
          {!display.isGenerated && bookmarkId ? (
            <PressableScale
              style={[
                styles.favoriteButton,
                { top: insets.top + scale(12), right: scale(20) },
              ]}
              onPress={() => {
                toggleSaved(bookmarkId);
              }}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark workout'}
            >
              <Ionicons
                name={saved ? 'star' : 'star-outline'}
                size={scale(16)}
                color={theme.colors.teal}
              />
            </PressableScale>
          ) : null}
        </View>

        <FadeInView style={styles.content} delay={100}>
          <View style={styles.difficultyRow}>
            {Array.from({ length: difficulty }, (_, index) => (
              <View key={`difficulty-${index}`} style={styles.difficultyDot} />
            ))}
          </View>
          <Text style={styles.title}>
            {display.isGenerated
              ? display.title.toUpperCase()
              : display.title}
          </Text>
          <View style={styles.voiceModeRow}>
            <VoiceModeTag voiceMode={display.voiceMode} />
          </View>
          {display.description ? (
            <Text style={styles.description}>{display.description}</Text>
          ) : null}

          <View style={styles.statsRow}>
            {stats.map((stat, index) => (
              <View key={stat.label} style={styles.statSlot}>
                {index > 0 ? <View style={styles.statDivider} /> : null}
                <View style={styles.statColumn}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </View>
            ))}
            {display.aiTracked ? (
              <View style={styles.statSlot}>
                <View style={styles.statDivider} />
                <View style={styles.statColumn}>
                  <View style={styles.aiRow}>
                    <Text style={styles.starMotif}>✦</Text>
                    <Text style={styles.statValueAi}>AI</Text>
                  </View>
                  <Text style={styles.statLabel}>TRACKED</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>CLASS BREAKDOWN</Text>
          </View>

          {display.exercises.map((exercise, index) => (
            <View
              key={`${exercise.name}-${index}`}
              style={[
                styles.exerciseRow,
                index === 0 && styles.exerciseRowFirst,
                index < display.exercises.length - 1 &&
                  styles.exerciseRowBorder,
              ]}
            >
              <Text style={styles.exerciseNumber}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {formatExerciseMeta(
                    exercise.sets,
                    exercise.reps,
                    exercise.repType,
                    exercise.meta
                  )}
                  {exercise.springSetting
                    ? ` · ${exercise.springSetting}`
                    : ''}
                </Text>
              </View>
              {exercise.tracked ? (
                <View style={styles.trackedDots}>
                  <Text style={styles.starMotif}>✦</Text>
                  <Text style={styles.trackedLabel}>TRACKED</Text>
                </View>
              ) : null}
            </View>
          ))}

          <View style={styles.bottomSpacer} />
        </FadeInView>
      </ScrollView>

      <View
        style={[
          styles.beginBar,
          { paddingBottom: Math.max(insets.bottom, scale(16)) + scale(8) },
        ]}
      >
        <PressableScale
          style={styles.beginButton}
          onPress={() => {
            const dateKey = toDateKey(new Date());
            if (display.isGenerated) {
              if (voiceReady) {
                navigation.navigate('LiveWorkout', {
                  generatedSlug: display.id,
                  dateKey,
                });
              } else {
                navigation.navigate('PrepareSession', {
                  generatedSlug: display.id,
                  dateKey,
                });
              }
              return;
            }
            navigation.navigate('LiveWorkout', {
              workoutId: display.id,
              libraryId: libraryWorkout?.id,
              dateKey,
            });
          }}
        >
          <Text style={styles.beginButtonText}>
            {display.isGenerated && !voiceReady ? 'GENERATE' : 'BEGIN'}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(12),
  },
  loadingText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: MUTED,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scale(110),
  },
  hero: {
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.surfaceMuted,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36, 33, 33, 0.35)',
  },
  iconButton: {
    position: 'absolute',
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  iconButtonText: {
    color: theme.colors.white,
    fontSize: scale(18),
  },
  favoriteButton: {
    position: 'absolute',
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(121, 203, 208, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: scale(20),
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    marginBottom: scale(16),
  },
  difficultyDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: theme.colors.teal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    lineHeight: scale(34),
    color: theme.colors.white,
    marginBottom: scale(10),
  },
  voiceModeRow: {
    marginBottom: scale(10),
  },
  description: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.2),
    lineHeight: scale(16),
    color: MUTED,
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: scale(0.5),
    borderBottomWidth: scale(0.5),
    borderColor: RULE,
    marginTop: scale(20),
    marginBottom: scale(28),
    paddingVertical: scale(16),
  },
  statSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: scale(1),
    height: scale(28),
    backgroundColor: RULE,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    letterSpacing: scale(-0.5),
    color: theme.colors.white,
    lineHeight: scale(24),
    textAlign: 'center',
  },
  statValueAi: {
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    letterSpacing: scale(-0.5),
    color: theme.colors.teal,
    lineHeight: scale(24),
  },
  statLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: MUTED,
    textTransform: 'uppercase',
    marginTop: scale(6),
    textAlign: 'center',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  starMotif: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    color: theme.colors.teal,
    lineHeight: scale(14),
  },
  sectionHeader: {
    marginBottom: scale(4),
  },
  sectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    color: MUTED,
    textTransform: 'uppercase',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
  },
  exerciseRowFirst: {
    borderTopWidth: scale(0.5),
    borderTopColor: RULE,
    marginTop: scale(10),
  },
  exerciseRowBorder: {
    borderBottomWidth: scale(0.5),
    borderBottomColor: RULE,
  },
  exerciseNumber: {
    width: scale(32),
    fontFamily: theme.fonts.header,
    fontSize: scale(13),
    color: MUTED,
  },
  exerciseInfo: {
    flex: 1,
    paddingRight: scale(8),
  },
  exerciseName: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(14),
    letterSpacing: 0,
    color: theme.colors.white,
    textTransform: 'none',
    marginBottom: scale(4),
  },
  exerciseMeta: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
    color: MUTED,
  },
  trackedDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  trackedLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.2),
    color: theme.colors.teal,
    textTransform: 'uppercase',
  },
  bottomSpacer: {
    height: scale(16),
  },
  beginBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: scale(12),
    backgroundColor: theme.colors.dark,
    borderTopWidth: scale(0.5),
    borderTopColor: RULE,
    zIndex: 5,
  },
  beginButton: {
    width: '100%',
    backgroundColor: theme.colors.red,
    paddingHorizontal: scale(14),
    paddingVertical: scale(14),
    borderRadius: scale(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  notFound: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.white,
    textAlign: 'center',
    marginTop: scale(100),
  },
});
