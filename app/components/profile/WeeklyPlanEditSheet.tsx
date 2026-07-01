import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/authErrors';
import {
  fetchUserProfile,
  GOAL_OPTIONS,
  saveUserProfile,
  TARGET_AREA_OPTIONS,
  TRAINING_FREQUENCY_OPTIONS,
  type TrainingFrequency,
  type UserProfile,
} from '../../lib/userProfile';
import {
  getCompletedDateKeys,
  readWorkoutHistory,
} from '../../lib/workoutHistory';
import { regenerateWeeklySchedule } from '../../lib/weeklySchedule';
import theme, { scale } from '../../theme';
import { ProfileEditDialog } from './ProfileEditDialog';

type Props = {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved?: () => void;
};

function toggleSelection<T>(list: T[], item: T): T[] {
  if (list.includes(item)) {
    return list.filter((entry) => entry !== item);
  }
  return [...list, item];
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function FrequencyToggle({
  value,
  onChange,
}: {
  value: TrainingFrequency;
  onChange: (value: TrainingFrequency) => void;
}) {
  return (
    <View style={styles.frequencyRow}>
      {TRAINING_FREQUENCY_OPTIONS.map((option) => {
        const active = value === option;
        return (
          <Pressable
            key={option}
            style={[styles.frequencyOption, active && styles.frequencyOptionActive]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.frequencyText,
                active && styles.frequencyTextActive,
              ]}
            >
              {option}
            </Text>
            <Text
              style={[
                styles.frequencySubtext,
                active && styles.frequencySubtextActive,
              ]}
            >
              / week
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function WeeklyPlanEditSheet({
  visible,
  profile,
  onClose,
  onSaved,
}: Props) {
  const [goals, setGoals] = useState<string[]>([]);
  const [targetAreas, setTargetAreas] = useState<string[]>([]);
  const [trainingFrequency, setTrainingFrequency] =
    useState<TrainingFrequency>('3-4x');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !profile) {
      return;
    }

    setGoals(profile.goals ?? []);
    setTargetAreas(profile.targetAreas ?? []);
    if (
      TRAINING_FREQUENCY_OPTIONS.includes(
        profile.trainingFrequency as TrainingFrequency
      )
    ) {
      setTrainingFrequency(profile.trainingFrequency as TrainingFrequency);
    }
  }, [visible, profile]);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    if (goals.length === 0) {
      Alert.alert('Goal required', 'Select at least one primary goal.');
      return;
    }

    if (targetAreas.length === 0) {
      Alert.alert('Target required', 'Select at least one target area.');
      return;
    }

    setSaving(true);
    try {
      await saveUserProfile(uid, {
        goals,
        targetAreas,
        trainingFrequency,
      });

      const history = await readWorkoutHistory();
      const savedProfile = await fetchUserProfile(uid);
      if (savedProfile) {
        await regenerateWeeklySchedule(
          savedProfile,
          getCompletedDateKeys(history)
        );
      }

      onSaved?.();
      onClose();
    } catch (err) {
      Alert.alert('Save failed', getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileEditDialog
      visible={visible}
      title="Weekly plan focus"
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      scrollable
    >
      <Text style={styles.hint}>
        These choices shape your workout schedule on the Calendar.
      </Text>

      <SectionLabel>PRIMARY GOALS</SectionLabel>
      <View style={styles.goalsList}>
        {GOAL_OPTIONS.map((goal) => {
          const selected = goals.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              style={[styles.goalCard, selected && styles.goalCardSelected]}
              onPress={() => setGoals((prev) => toggleSelection(prev, goal.id))}
            >
              <Text
                style={[styles.goalTitle, selected && styles.goalTitleSelected]}
              >
                {goal.title}
              </Text>
              <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>TARGET AREAS</SectionLabel>
      <View style={styles.chipWrap}>
        {TARGET_AREA_OPTIONS.map((area) => {
          const selected = targetAreas.includes(area);
          return (
            <Pressable
              key={area}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() =>
                setTargetAreas((prev) => toggleSelection(prev, area))
              }
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {area}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>TRAINING FREQUENCY</SectionLabel>
      <FrequencyToggle
        value={trainingFrequency}
        onChange={setTrainingFrequency}
      />
    </ProfileEditDialog>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...theme.typography.body,
    fontSize: scale(12),
    lineHeight: scale(18),
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(8),
    marginTop: theme.spacing.md,
  },
  goalsList: {
    gap: scale(8),
  },
  goalCard: {
    borderRadius: theme.radius.md,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
  },
  goalCardSelected: {
    borderColor: theme.colors.red,
    backgroundColor: `${theme.colors.red}0a`,
  },
  goalTitle: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(13),
    color: theme.colors.textPrimary,
    marginBottom: scale(2),
  },
  goalTitleSelected: {
    color: theme.colors.red,
  },
  goalSubtitle: {
    ...theme.typography.body,
    fontSize: scale(11),
    color: theme.colors.textSecondary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  chip: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: theme.radius.full,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipSelected: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  chipText: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textPrimary,
  },
  chipTextSelected: {
    color: theme.colors.white,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(4),
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: scale(10),
    paddingHorizontal: scale(6),
    borderRadius: theme.radius.md,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  frequencyOptionActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  frequencyText: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(14),
    color: theme.colors.textPrimary,
  },
  frequencyTextActive: {
    color: theme.colors.white,
  },
  frequencySubtext: {
    ...theme.typography.body,
    fontSize: scale(10),
    color: theme.colors.textSecondary,
    marginTop: scale(2),
  },
  frequencySubtextActive: {
    color: theme.colors.grey400,
  },
});
