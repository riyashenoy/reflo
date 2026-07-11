import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  AnimatedProgressBar,
  FadeInView,
  PressableScale,
} from '../components/motion';
import { getWorkoutById } from '../data/workouts';
import { getLibraryWorkout } from '../data/workoutLibrary';
import {
  estimateFormScore,
  recordWorkoutCompletion,
  toDateKey,
} from '../lib/workoutHistory';
import type { AppStackParamList } from '../navigation';
import type { SessionLogEntry } from '../hooks/usePoseDetection';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'PostWorkout'>;

type Stage = 'report' | 'rating' | 'overall';

const RATING_OPTIONS = [
  'Too Easy',
  'Just Right',
  'Challenging',
  'Too Difficult',
] as const;

const WENT_WELL = [
  'Strong core engagement throughout the session',
  'Consistent pacing between exercises',
  'Smooth transitions and controlled movement',
];

const WORK_ON = [
  'Keep shoulders relaxed during plank variations',
  'Extend fully at the top of each repetition',
];

const CLIP_LABELS: Record<string, string> = {
  '01': 'Stay focused and keep your rhythm',
  '02': 'Keep breathing steadily through each rep',
  '03': 'Great form — keep that up',
  '04': 'Strong control throughout the set',
  '05': 'Watch for hips rising — squeeze the glutes',
  '06': 'Keep hips lifted — avoid sagging',
  '07': 'Lift your head — chin away from chest',
  '08': 'Keep arms hovering — don\'t let them sink',
  '09': 'Push knees out over your second toe',
  '10': 'Keep heels lifted in this position',
  '11': 'Slow down — control the movement',
  '12': 'Maintain a straight line through hips',
  '13': 'Reduce momentum — move with control',
};

function buildReportItems(sessionLog: SessionLogEntry[] | undefined) {
  if (!sessionLog?.length) {
    return {
      wentWell: WENT_WELL,
      workOn: WORK_ON,
    };
  }

  const wentWell = sessionLog
    .filter((entry) => entry.type === 'positive')
    .map(
      (entry) =>
        `${entry.exercise}: ${CLIP_LABELS[entry.clipPlayed] ?? 'Good form noted'}`
    );

  const workOn = sessionLog
    .filter((entry) => entry.type === 'correction')
    .map(
      (entry) =>
        `${entry.exercise}: ${CLIP_LABELS[entry.clipPlayed] ?? 'Form correction noted'}`
    );

  return {
    wentWell: wentWell.length ? wentWell : WENT_WELL,
    workOn: workOn.length ? workOn : WORK_ON,
  };
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function ProgressBar({ progress }: { progress: number }) {
  return (
    <AnimatedProgressBar
      progress={progress}
      style={styles.progressTrack}
    />
  );
}

function SuccessEmoji() {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.Text style={[styles.emoji, { opacity, transform: [{ scale }] }]}>
      🎉
    </Animated.Text>
  );
}

function BulletCard({ items }: { items: string[] }) {
  return (
    <View style={styles.card}>
      {items.map((item) => (
        <Text key={item} style={styles.bulletItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export default function PostWorkout({ route, navigation }: Props) {
  const {
    workoutId,
    libraryId,
    dateKey,
    formScore: routeFormScore,
    readOnly = false,
    sessionLog,
  } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const libraryWorkout = libraryId ? getLibraryWorkout(libraryId) : undefined;
  const displayTitle = libraryWorkout?.title ?? workout?.title ?? 'Workout';
  const reportItems = buildReportItems(sessionLog);
  const hasRecordedCompletion = useRef(false);

  const displayedFormScore = useMemo(() => {
    if (routeFormScore != null) {
      return routeFormScore;
    }
    return estimateFormScore(sessionLog, dateKey ?? toDateKey(new Date()));
  }, [routeFormScore, sessionLog, dateKey]);

  useEffect(() => {
    if (readOnly || !workoutId || hasRecordedCompletion.current) {
      return;
    }

    hasRecordedCompletion.current = true;
    void recordWorkoutCompletion(workoutId, sessionLog, {
      dateKey: dateKey ?? toDateKey(new Date()),
      libraryId,
    });
  }, [readOnly, workoutId, sessionLog, dateKey, libraryId]);

  const [stage, setStage] = useState<Stage>('report');
  const [ratingIndex, setRatingIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [starRating, setStarRating] = useState(0);

  const exerciseCount = workout?.exercises.length ?? 0;
  const currentExercise = workout?.exercises[ratingIndex];
  const dayOfWeek = DAY_NAMES[new Date().getDay()];

  const handleNextRating = () => {
    if (!selectedOption || !workout) {
      return;
    }

    const updatedRatings = { ...ratings, [ratingIndex]: selectedOption };
    setRatings(updatedRatings);

    const isLastExercise = ratingIndex >= exerciseCount - 1;

    if (isLastExercise) {
      setStage('overall');
      setSelectedOption(null);
      return;
    }

    setRatingIndex((prev) => prev + 1);
    setSelectedOption(null);
  };

  const handleCompleteRating = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Workout not found</Text>
      </View>
    );
  }

  if (stage === 'report') {
    return (
      <View style={styles.container}>
        <Pressable
          style={[styles.closeButton, { top: insets.top + scale(8) }]}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <FadeInView>
            <SuccessEmoji />
            <Text style={styles.heading}>You Crushed It.</Text>
            <Text style={styles.subtitle}>
              {displayTitle} · {workout.duration} min · {dayOfWeek}
            </Text>

            <View style={styles.formScoreHero}>
              <Text style={styles.formScoreValue}>{displayedFormScore}</Text>
              <Text style={styles.formScoreLabel}>FORM SCORE</Text>
            </View>

            <Text style={[styles.sectionLabel, styles.sectionLabelGreen]}>
              WHAT WENT WELL
            </Text>
            <BulletCard items={reportItems.wentWell} />

            <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
              WORK ON THIS
            </Text>
            <BulletCard items={reportItems.workOn} />

            {!readOnly ? (
              <PressableScale
                style={[styles.pillButton, styles.pillButtonRight]}
                onPress={() => {
                  setStage('rating');
                  setRatingIndex(0);
                  setSelectedOption(null);
                }}
              >
                <Text style={styles.pillButtonText}>RATE WORKOUT →</Text>
              </PressableScale>
            ) : null}
          </FadeInView>
        </ScrollView>
      </View>
    );
  }

  if (stage === 'rating' && currentExercise) {
    const progress =
      exerciseCount > 0 ? (ratingIndex + 1) / exerciseCount : 0;

    return (
      <View style={styles.container}>
        <ProgressBar progress={progress} />

        <ScrollView contentContainerStyle={styles.ratingContent}>
          <FadeInView key={`rating-${ratingIndex}`}>
            <Text style={styles.ratingQuestion}>
              How was the {currentExercise.name}?
            </Text>

            <View style={styles.optionsList}>
              {RATING_OPTIONS.map((option) => {
                const isSelected = selectedOption === option;
                return (
                  <PressableScale
                    key={option}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedOption(option)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.optionText}>{option}</Text>
                  </PressableScale>
                );
              })}
            </View>

            <PressableScale
              style={[
                styles.pillButton,
                styles.pillButtonRight,
                !selectedOption && styles.pillButtonDisabled,
              ]}
              onPress={handleNextRating}
              disabled={!selectedOption}
            >
              <Text style={styles.pillButtonText}>NEXT →</Text>
            </PressableScale>
          </FadeInView>
        </ScrollView>
      </View>
    );
  }

  if (stage === 'overall') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.overallContent}
      >
        <FadeInView>
          <Text style={styles.ratingQuestion}>How was the class overall?</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <PressableScale key={star} onPress={() => setStarRating(star)}>
                <Text
                  style={[
                    styles.star,
                    star <= starRating
                      ? styles.starFilled
                      : styles.starEmpty,
                  ]}
                >
                  ★
                </Text>
              </PressableScale>
            ))}
          </View>

          <PressableScale
            style={[
              styles.pillButton,
              styles.pillButtonCenter,
              starRating === 0 && styles.pillButtonDisabled,
            ]}
            onPress={handleCompleteRating}
            disabled={starRating === 0}
          >
            <Text style={styles.pillButtonText}>COMPLETE RATING</Text>
          </PressableScale>
        </FadeInView>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.notFound}>Unable to load workout feedback</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: scale(20),
    paddingTop: scale(56),
    paddingBottom: scale(40),
  },
  ratingContent: {
    padding: scale(20),
    paddingBottom: scale(40),
    flexGrow: 1,
  },
  overallContent: {
    padding: scale(20),
    paddingBottom: scale(40),
    alignItems: 'center',
  },
  emoji: {
    fontSize: scale(48),
    textAlign: 'center',
    marginTop: scale(24),
    marginBottom: scale(16),
  },
  heading: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: scale(20),
  },
  closeButton: {
    position: 'absolute',
    right: scale(20),
    zIndex: 10,
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: theme.colors.white,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(16),
    color: theme.colors.textPrimary,
  },
  formScoreHero: {
    alignItems: 'center',
    marginBottom: scale(28),
    paddingVertical: scale(20),
  },
  formScoreValue: {
    fontFamily: theme.fonts.header,
    fontSize: scale(72),
    lineHeight: scale(76),
    color: theme.colors.teal,
  },
  formScoreLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    marginTop: scale(4),
  },
  sectionLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
    marginBottom: scale(8),
    marginTop: scale(8),
  },
  sectionLabelGreen: {
    color: theme.colors.teal,
  },
  sectionLabelRed: {
    color: theme.colors.red,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    padding: scale(16),
    marginBottom: scale(12),
  },
  bulletItem: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.textPrimary,
    lineHeight: scale(22),
    marginBottom: scale(6),
  },
  progressTrack: {
    marginHorizontal: scale(20),
    marginTop: scale(16),
  },
  ratingQuestion: {
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    letterSpacing: scale(-0.5),
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: scale(32),
    marginBottom: scale(24),
  },
  optionsList: {
    gap: scale(12),
    marginBottom: scale(24),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    padding: scale(16),
    gap: scale(12),
  },
  optionCardSelected: {
    borderColor: `${theme.colors.red}44`,
  },
  radioOuter: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: scale(1.5),
    borderColor: theme.colors.grey400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.red,
  },
  radioInner: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: theme.colors.red,
  },
  optionText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(14),
    color: theme.colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(32),
  },
  star: {
    fontSize: scale(40),
  },
  starFilled: {
    color: theme.colors.red,
  },
  starEmpty: {
    color: theme.colors.grey200,
  },
  pillButton: {
    backgroundColor: theme.colors.dark,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    paddingHorizontal: scale(24),
    alignSelf: 'flex-start',
  },
  pillButtonRight: {
    alignSelf: 'flex-end',
    marginTop: scale(16),
  },
  pillButtonCenter: {
    alignSelf: 'center',
  },
  pillButtonDisabled: {
    opacity: 0.4,
  },
  pillButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
  notFound: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    textAlign: 'center',
    marginTop: scale(80),
    color: theme.colors.textPrimary,
  },
});
