import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { auth } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  fetchUserProfile,
  MINDFUL_AREA_OPTIONS,
  saveUserProfile,
  type ProfileEditSection,
} from '../lib/userProfile';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ProfileEdit'>;

type ExperienceLevel = (typeof EXPERIENCE_LEVEL_OPTIONS)[number];
type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function ThreeOptionToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.toggleGroup}>
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
                styles.toggleOptionText,
                active && styles.toggleOptionTextActive,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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

function toggleSelection<T>(list: T[], item: T): T[] {
  if (list.includes(item)) {
    return list.filter((entry) => entry !== item);
  }
  return [...list, item];
}

export default function ProfileEdit({ route, navigation }: Props) {
  const { section = 'about' } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<ProfileEditSection, number>>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>('Intermediate');
  const [equipment, setEquipment] = useState<Equipment>('Reformer');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [birthday, setBirthday] = useState('');
  const [mindfulAreas, setMindfulAreas] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const profile = await fetchUserProfile(uid);
        if (profile) {
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
          setHeight(profile.height ?? '');
          setHeightUnit(profile.heightUnit ?? 'cm');
          setWeight(profile.weight ?? '');
          setWeightUnit(profile.weightUnit ?? 'kg');
          setBirthday(profile.birthday ?? '');
          setMindfulAreas(profile.mindfulAreas ?? []);
        }
      } catch (err) {
        Alert.alert('Error', getAuthErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const offset = sectionOffsets.current[section];
    if (offset != null) {
      scrollRef.current?.scrollTo({ y: Math.max(offset - 16, 0), animated: true });
    }
  }, [loading, section]);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Error', 'You must be signed in to save changes.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setSaving(true);
    try {
      await saveUserProfile(uid, {
        name: name.trim(),
        experienceLevel,
        equipment,
        height,
        heightUnit,
        weight,
        weightUnit,
        birthday,
        mindfulAreas,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const registerSection =
    (key: ProfileEditSection) => (event: { nativeEvent: { layout: { y: number } } }) => {
      sectionOffsets.current[key] = event.nativeEvent.layout.y;
    };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.red} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Edit Profile</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View onLayout={registerSection('about')}>
          <Text style={styles.sectionHeading}>About you</Text>

          <SectionLabel>YOUR NAME *</SectionLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <SectionLabel>EXPERIENCE LEVEL</SectionLabel>
          <ThreeOptionToggle
            options={EXPERIENCE_LEVEL_OPTIONS}
            value={experienceLevel}
            onChange={setExperienceLevel}
          />

          <SectionLabel>EQUIPMENT ACCESS</SectionLabel>
          {EQUIPMENT_OPTIONS.map((item) => {
            const selected = equipment === item;
            return (
              <Pressable
                key={item}
                style={[
                  styles.equipmentCard,
                  selected && styles.equipmentCardSelected,
                ]}
                onPress={() => setEquipment(item)}
              >
                <View style={styles.equipmentIcon} />
                <Text style={styles.equipmentLabel}>{item}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View onLayout={registerSection('body')} style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Body measurements</Text>

          <SectionLabel>HEIGHT</SectionLabel>
          <UnitToggle
            left="cm"
            right="ft"
            value={heightUnit}
            onChange={setHeightUnit}
          />
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholder="168"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <SectionLabel>WEIGHT</SectionLabel>
          <UnitToggle
            left="kg"
            right="lbs"
            value={weightUnit}
            onChange={setWeightUnit}
          />
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="62"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <SectionLabel>BIRTHDAY</SectionLabel>
          <TextInput
            style={styles.input}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="e.g. 02/29/2004"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View onLayout={registerSection('mindful')} style={styles.sectionBlock}>
          <Text style={styles.sectionHeading}>Mindful areas</Text>
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
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {chip}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
    backgroundColor: theme.colors.background,
  },
  backText: {
    fontSize: scale(16),
    color: theme.colors.red,
    fontWeight: '600',
    width: scale(72),
  },
  topBarTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  topBarSpacer: {
    width: scale(72),
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(100),
  },
  sectionBlock: {
    marginTop: scale(24),
  },
  sectionHeading: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    fontSize: scale(22),
    color: theme.colors.textPrimary,
    marginBottom: scale(12),
  },
  fieldLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(8),
    marginTop: scale(8),
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.sm,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    padding: scale(14),
    ...theme.typography.body,
    fontSize: scale(15),
    color: theme.colors.textPrimary,
    marginBottom: scale(12),
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: theme.colors.grey200,
    borderRadius: scale(24),
    padding: scale(4),
    marginBottom: scale(16),
  },
  toggleOption: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(20),
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: theme.colors.white,
  },
  toggleOptionText: {
    fontSize: scale(13),
    color: theme.colors.textSecondary,
  },
  toggleOptionTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: scale(12),
    borderWidth: scale(0.5),
    borderColor: theme.colors.border,
    padding: scale(14),
    marginBottom: scale(10),
  },
  equipmentCardSelected: {
    backgroundColor: `${theme.colors.red}0a`,
    borderWidth: scale(1),
    borderColor: `${theme.colors.red}44`,
  },
  equipmentIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(8),
    backgroundColor: theme.colors.grey200,
    marginRight: scale(12),
  },
  equipmentLabel: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '600',
    color: theme.colors.textPrimary,
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
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.grey200,
    borderRadius: scale(8),
    padding: scale(3),
    marginBottom: scale(8),
  },
  unitOption: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(6),
  },
  unitOptionActive: {
    backgroundColor: theme.colors.white,
  },
  unitOptionText: {
    fontSize: scale(13),
    color: theme.colors.textSecondary,
  },
  unitOptionTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: theme.colors.white,
    borderWidth: scale(0.5),
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: `${theme.colors.red}0a`,
    borderWidth: scale(1),
    borderColor: theme.colors.red,
  },
  chipText: {
    fontSize: scale(13),
    color: theme.colors.textSecondary,
  },
  chipTextSelected: {
    color: theme.colors.red,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(12),
    backgroundColor: theme.colors.background,
    borderTopWidth: scale(1),
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.full,
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
});
