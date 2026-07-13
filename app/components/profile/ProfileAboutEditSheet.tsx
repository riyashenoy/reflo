import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/authErrors';
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  fetchUserProfile,
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

type ExperienceLevel = (typeof EXPERIENCE_LEVEL_OPTIONS)[number];
type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

type Props = {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
};

function OptionToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      {options.map((option) => {
        const active = value === option;
        return (
          <Pressable
            key={option}
            style={[styles.toggleOption, active && styles.toggleOptionActive]}
            onPress={() => onChange(option)}
          >
            <Text
              style={[
                styles.toggleText,
                active && styles.toggleTextActive,
              ]}
              numberOfLines={1}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProfileAboutEditSheet({
  visible,
  profile,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState('');
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>('Intermediate');
  const [equipment, setEquipment] = useState<Equipment>('Reformer');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !profile) {
      return;
    }

    setName(profile.name ?? '');
    if (
      EXPERIENCE_LEVEL_OPTIONS.includes(
        profile.experienceLevel as ExperienceLevel
      )
    ) {
      setExperienceLevel(profile.experienceLevel as ExperienceLevel);
    }
    if (EQUIPMENT_OPTIONS.includes(profile.equipment as Equipment)) {
      setEquipment(profile.equipment as Equipment);
    }
  }, [visible, profile]);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      const patch = {
        name: name.trim(),
        experienceLevel,
        equipment,
      };

      await saveUserProfile(uid, patch);
      const updated = { ...(profile ?? {}), ...patch };
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
      title="Edit profile"
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
    >
      <Text style={styles.label}>YOUR NAME</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={theme.colors.textSecondary}
        autoFocus
      />

      <Text style={styles.label}>EXPERIENCE</Text>
      <OptionToggle
        options={EXPERIENCE_LEVEL_OPTIONS}
        value={experienceLevel}
        onChange={setExperienceLevel}
      />

      <Text style={[styles.label, styles.labelSpaced]}>EQUIPMENT</Text>
      <View style={styles.equipmentRow}>
        {EQUIPMENT_OPTIONS.map((item) => {
          const selected = equipment === item;
          return (
            <Pressable
              key={item}
              style={[styles.equipmentChip, selected && styles.equipmentChipActive]}
              onPress={() => setEquipment(item)}
            >
              <Text
                style={[
                  styles.equipmentText,
                  selected && styles.equipmentTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ProfileEditDialog>
  );
}

const styles = StyleSheet.create({
  label: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(8),
  },
  labelSpaced: {
    marginTop: scale(12),
  },
  input: {
    ...theme.typography.body,
    fontSize: scale(15),
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    marginBottom: scale(4),
  },
  toggleRow: {
    flexDirection: 'row',
    gap: scale(6),
  },
  toggleOption: {
    flex: 1,
    paddingVertical: scale(9),
    paddingHorizontal: scale(4),
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  toggleText: {
    ...theme.typography.body,
    fontSize: scale(11),
    color: theme.colors.textPrimary,
  },
  toggleTextActive: {
    color: theme.colors.white,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  equipmentChip: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  equipmentChipActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  equipmentText: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textPrimary,
  },
  equipmentTextActive: {
    color: theme.colors.white,
  },
});
