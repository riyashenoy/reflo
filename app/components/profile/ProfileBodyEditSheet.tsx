import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { auth } from '../../lib/firebase';
import { getAuthErrorMessage } from '../../lib/authErrors';
import {
  getAgeFromBirthday,
  saveUserProfile,
  type UserProfile,
} from '../../lib/userProfile';
import theme, { scale } from '../../theme';
import { ProfileEditDialog } from './ProfileEditDialog';

export type BodyEditField = 'height' | 'weight' | 'age';

type Props = {
  visible: boolean;
  field: BodyEditField | null;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
};

const FIELD_TITLES: Record<BodyEditField, string> = {
  height: 'Height',
  weight: 'Weight',
  age: 'Age',
};

function UnitToggle({
  left,
  right,
  value,
  onChange,
}: {
  left: string;
  right: string;
  value: string;
  onChange: (unit: string) => void;
}) {
  return (
    <View style={styles.unitToggle}>
      <Pressable
        style={[styles.unitOption, value === left && styles.unitOptionActive]}
        onPress={() => onChange(left)}
      >
        <Text
          style={[
            styles.unitOptionText,
            value === left && styles.unitOptionTextActive,
          ]}
        >
          {left}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.unitOption, value === right && styles.unitOptionActive]}
        onPress={() => onChange(right)}
      >
        <Text
          style={[
            styles.unitOptionText,
            value === right && styles.unitOptionTextActive,
          ]}
        >
          {right}
        </Text>
      </Pressable>
    </View>
  );
}

export function ProfileBodyEditSheet({
  visible,
  field,
  profile,
  onClose,
  onSaved,
}: Props) {
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [birthday, setBirthday] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !profile) {
      return;
    }

    setHeight(profile.height ?? '');
    setHeightUnit(profile.heightUnit ?? 'cm');
    setWeight(profile.weight ?? '');
    setWeightUnit(profile.weightUnit ?? 'kg');
    setBirthday(profile.birthday ?? '');
  }, [visible, profile]);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !field) {
      return;
    }

    if (field === 'height' && !height.trim()) {
      Alert.alert('Height required', 'Please enter your height.');
      return;
    }

    if (field === 'weight' && !weight.trim()) {
      Alert.alert('Weight required', 'Please enter your weight.');
      return;
    }

    if (field === 'age' && !birthday.trim()) {
      Alert.alert('Birthday required', 'Please enter your birthday.');
      return;
    }

    setSaving(true);
    try {
      const patch: Partial<UserProfile> =
        field === 'height'
          ? { height: height.trim(), heightUnit }
          : field === 'weight'
            ? { weight: weight.trim(), weightUnit }
            : { birthday: birthday.trim() };

      await saveUserProfile(uid, patch);
      onSaved({ ...(profile ?? {}), ...patch });
      onClose();
    } catch (err) {
      Alert.alert('Save failed', getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!field) {
    return null;
  }

  return (
    <ProfileEditDialog
      visible={visible}
      title={FIELD_TITLES[field]}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
    >
      {field === 'height' ? (
        <>
          <Text style={styles.label}>UNIT</Text>
          <UnitToggle
            left="cm"
            right="ft"
            value={heightUnit}
            onChange={setHeightUnit}
          />
          <Text style={styles.label}>HEIGHT</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholder="168"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
          />
        </>
      ) : null}

      {field === 'weight' ? (
        <>
          <Text style={styles.label}>UNIT</Text>
          <UnitToggle
            left="kg"
            right="lbs"
            value={weightUnit}
            onChange={setWeightUnit}
          />
          <Text style={styles.label}>WEIGHT</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="62"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
          />
        </>
      ) : null}

      {field === 'age' ? (
        <>
          <Text style={styles.label}>BIRTHDAY</Text>
          <TextInput
            style={styles.input}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="e.g. 02/29/2004"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus
          />
          {birthday.trim() ? (
            <Text style={styles.hint}>
              Age: {getAgeFromBirthday(birthday)}
            </Text>
          ) : null}
        </>
      ) : null}
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
  hint: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textSecondary,
    marginTop: scale(4),
  },
  unitToggle: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(12),
  },
  unitOption: {
    flex: 1,
    paddingVertical: scale(9),
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  unitOptionActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  unitOptionText: {
    ...theme.typography.body,
    fontSize: scale(13),
    color: theme.colors.textPrimary,
  },
  unitOptionTextActive: {
    color: theme.colors.white,
  },
});
