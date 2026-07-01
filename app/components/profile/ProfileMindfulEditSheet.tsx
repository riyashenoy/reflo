import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/authErrors';
import {
  fetchUserProfile,
  MINDFUL_AREA_OPTIONS,
  saveUserProfile,
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
  onSaved: (profile: UserProfile) => void;
};

function toggleSelection<T>(list: T[], item: T): T[] {
  if (list.includes(item)) {
    return list.filter((entry) => entry !== item);
  }
  return [...list, item];
}

export function ProfileMindfulEditSheet({
  visible,
  profile,
  onClose,
  onSaved,
}: Props) {
  const [mindfulAreas, setMindfulAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !profile) {
      return;
    }

    setMindfulAreas(profile.mindfulAreas ?? []);
  }, [visible, profile]);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    setSaving(true);
    try {
      await saveUserProfile(uid, { mindfulAreas });
      const updated = { ...(profile ?? {}), mindfulAreas };
      const history = await readWorkoutHistory();
      const savedProfile = await fetchUserProfile(uid);
      if (savedProfile) {
        await regenerateWeeklySchedule(
          savedProfile,
          getCompletedDateKeys(history)
        );
      }
      onSaved(updated);
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
      title="Mindful areas"
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
    >
      <Text style={styles.hint}>
        Select any areas you want reflo to keep in mind during your workouts.
      </Text>
      <View style={styles.chipWrap}>
        {MINDFUL_AREA_OPTIONS.map((chip) => {
          const selected = mindfulAreas.includes(chip);
          return (
            <Pressable
              key={chip}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() =>
                setMindfulAreas((prev) => toggleSelection(prev, chip))
              }
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {chip}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ProfileEditDialog>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...theme.typography.body,
    fontSize: scale(12),
    lineHeight: scale(18),
    color: theme.colors.textSecondary,
    marginBottom: scale(12),
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
});
