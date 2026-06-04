import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getWorkoutById } from '../data/workouts';
import type { AppStackParamList } from '../navigation';

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
  const { workoutId } = route.params ?? {};
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;

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
        <BulletCard items={WENT_WELL} />

        <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
          WORK ON THIS
        </Text>
        <BulletCard items={WORK_ON} />

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
    backgroundColor: '#f2f0eb',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  ratingContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  overallContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  heading: {
    fontFamily: 'Georgia',
    fontSize: 32,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b6b6b',
    textAlign: 'center',
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionLabelGreen: {
    color: '#1D9E75',
  },
  sectionLabelRed: {
    color: '#cc2200',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 6,
  },
  progressTrack: {
    height: 4,
    flexDirection: 'row',
    backgroundColor: '#e8e6e0',
    borderRadius: 2,
    marginHorizontal: 20,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#cc2200',
    borderRadius: 2,
  },
  ratingQuestion: {
    fontFamily: 'Georgia',
    fontSize: 26,
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#0000001a',
    padding: 16,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: '#cc220044',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#cccccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#cc2200',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#cc2200',
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  star: {
    fontSize: 40,
  },
  starFilled: {
    color: '#cc2200',
  },
  starEmpty: {
    color: '#e8e6e0',
  },
  pillButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  pillButtonRight: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  pillButtonCenter: {
    alignSelf: 'center',
  },
  pillButtonDisabled: {
    opacity: 0.4,
  },
  pillButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  notFound: {
    textAlign: 'center',
    marginTop: 80,
    color: '#1a1a1a',
  },
});
