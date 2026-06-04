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
        <ActivityIndicator size="large" color="#cc2200" />
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
            placeholderTextColor="#00000044"
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
            placeholderTextColor="#00000044"
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
            placeholderTextColor="#00000044"
          />

          <SectionLabel>BIRTHDAY</SectionLabel>
          <TextInput
            style={styles.input}
            value={birthday}
            onChangeText={setBirthday}
            placeholder="e.g. 02/29/2004"
            placeholderTextColor="#00000044"
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
            <ActivityIndicator color="#ffffff" />
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
    backgroundColor: '#f2f0eb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f0eb',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#f2f0eb',
  },
  backText: {
    fontSize: 16,
    color: '#cc2200',
    fontWeight: '600',
    width: 72,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  topBarSpacer: {
    width: 72,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionBlock: {
    marginTop: 24,
  },
  sectionHeading: {
    fontFamily: 'Georgia',
    fontSize: 22,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#00000055',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#0000001a',
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#e8e6e0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: '#ffffff',
  },
  toggleOptionText: {
    fontSize: 13,
    color: '#00000055',
  },
  toggleOptionTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#0000001a',
    padding: 14,
    marginBottom: 10,
  },
  equipmentCardSelected: {
    backgroundColor: '#cc22000a',
    borderWidth: 1,
    borderColor: '#cc220044',
  },
  equipmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e8e6e0',
    marginRight: 12,
  },
  equipmentLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
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
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#e8e6e0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitOptionActive: {
    backgroundColor: '#ffffff',
  },
  unitOptionText: {
    fontSize: 13,
    color: '#00000055',
  },
  unitOptionTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#0000001a',
  },
  chipSelected: {
    backgroundColor: '#cc22000a',
    borderWidth: 1,
    borderColor: '#cc2200',
  },
  chipText: {
    fontSize: 13,
    color: '#00000055',
  },
  chipTextSelected: {
    color: '#cc2200',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#f2f0eb',
    borderTopWidth: 1,
    borderTopColor: '#0000000f',
  },
  saveButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
