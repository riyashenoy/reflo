import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getWorkoutById } from '../data/workouts';
import { recordWorkoutCompletion } from '../lib/workoutHistory';
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
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { flex: clamped }]} />
      <View style={{ flex: 1 - clamped }} />
    </View>
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
  const { workoutId, sessionLog } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  const reportItems = buildReportItems(sessionLog);
  const hasRecordedCompletion = useRef(false);

  useEffect(() => {
    if (!workoutId || hasRecordedCompletion.current) {
      return;
    }

    hasRecordedCompletion.current = true;
    void recordWorkoutCompletion(workoutId, sessionLog);
  }, [workoutId, sessionLog]);

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.heading}>You Crushed It.</Text>
        <Text style={styles.subtitle}>
          {workout.title} · {workout.duration} min · {dayOfWeek}
        </Text>

        <Text style={[styles.sectionLabel, styles.sectionLabelGreen]}>
          WHAT WENT WELL
        </Text>
        <BulletCard items={reportItems.wentWell} />

        <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
          WORK ON THIS
        </Text>
        <BulletCard items={reportItems.workOn} />

        <Pressable
          style={[styles.pillButton, styles.pillButtonRight]}
          onPress={() => {
            setStage('rating');
            setRatingIndex(0);
            setSelectedOption(null);
          }}
        >
          <Text style={styles.pillButtonText}>RATE WORKOUT →</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (stage === 'rating' && currentExercise) {
    const progress =
      exerciseCount > 0 ? ratingIndex / exerciseCount : 0;

    return (
      <View style={styles.container}>
        <ProgressBar progress={progress} />

        <ScrollView contentContainerStyle={styles.ratingContent}>
          <Text style={styles.ratingQuestion}>
            How was the {currentExercise.name}?
          </Text>

          <View style={styles.optionsList}>
            {RATING_OPTIONS.map((option) => {
              const isSelected = selectedOption === option;
              return (
                <Pressable
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
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[
              styles.pillButton,
              styles.pillButtonRight,
              !selectedOption && styles.pillButtonDisabled,
            ]}
            onPress={handleNextRating}
            disabled={!selectedOption}
          >
            <Text style={styles.pillButtonText}>NEXT →</Text>
          </Pressable>
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
        <ProgressBar progress={1} />

        <Text style={styles.ratingQuestion}>How was the class overall?</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setStarRating(star)}>
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
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.pillButton,
            styles.pillButtonCenter,
            starRating === 0 && styles.pillButtonDisabled,
          ]}
          onPress={handleCompleteRating}
          disabled={starRating === 0}
        >
          <Text style={styles.pillButtonText}>COMPLETE RATING</Text>
        </Pressable>
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
    marginBottom: scale(28),
  },
  sectionLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
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
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: scale(6),
  },
  progressTrack: {
    height: scale(4),
    flexDirection: 'row',
    backgroundColor: theme.colors.grey200,
    borderRadius: scale(2),
    marginHorizontal: scale(20),
    marginTop: scale(16),
    overflow: 'hidden',
  },
  progressFill: {
    height: scale(4),
    backgroundColor: theme.colors.red,
    borderRadius: scale(2),
  },
  ratingQuestion: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
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
    ...theme.typography.body,
    fontSize: scale(16),
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
    borderRadius: theme.radius.full,
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
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  notFound: {
    ...theme.typography.body,
    textAlign: 'center',
    marginTop: scale(80),
    color: theme.colors.textPrimary,
  },
});
