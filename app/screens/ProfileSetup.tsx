import { useState } from 'react';
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
import { doc, setDoc } from 'firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { auth, db } from '../lib/firebase';
import { getAuthErrorMessage } from '../lib/authErrors';
import { regenerateWeeklySchedule } from '../lib/weeklySchedule';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'ProfileSetup'>;

type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type Equipment = 'Reformer' | 'Mat' | 'Resistance Bands';
type TrainingFrequency = '1-2x' | '3-4x' | '5-7x';

const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
];

const EQUIPMENT_OPTIONS: Equipment[] = [
  'Reformer',
  'Mat',
  'Resistance Bands',
];

const MINDFUL_CHIPS = [
  'Lower back',
  'Tight Hips',
  'Knee sensitivity',
  'Shoulder injury',
  'Neck Tension',
  'Other',
  'None',
];

const GOALS = [
  { id: 'strength', title: 'Build Strength', subtitle: 'Muscle tone and endurance' },
  { id: 'flexibility', title: 'Flexibility', subtitle: 'Mobility and stretch' },
  { id: 'weight', title: 'Lose Weight', subtitle: 'Calorie burn focus' },
  { id: 'posture', title: 'Better Posture', subtitle: 'Alignment and balance' },
  { id: 'stress', title: 'Stress Relief', subtitle: 'Mind-body connection' },
  { id: 'performance', title: 'Performance', subtitle: 'Sport cross training' },
];

const TARGET_AREAS = [
  'Core',
  'Glutes',
  'Arms',
  'Back',
  'Inner Thighs',
  'Full Body',
];

const FREQUENCY_OPTIONS: TrainingFrequency[] = ['1-2x', '3-4x', '5-7x'];

function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { flex: clamped }]} />
      <View style={{ flex: 1 - clamped }} />
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function ThreeOptionToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
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
        style={[
          styles.unitOption,
          value === left && styles.unitOptionActive,
        ]}
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
        style={[
          styles.unitOption,
          value === right && styles.unitOptionActive,
        ]}
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

export default function ProfileSetup({ navigation }: Props) {
  const [step, setStep] = useState(1);
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

  const [goals, setGoals] = useState<string[]>([]);
  const [targetAreas, setTargetAreas] = useState<string[]>([]);
  const [trainingFrequency, setTrainingFrequency] =
    useState<TrainingFrequency>('3-4x');

  const progress = step === 1 ? 0.33 : step === 2 ? 0.66 : 1;
  const canContinueStep1 = name.trim().length > 0;

  const handleFinish = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Error', 'You must be signed in to save your profile.');
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        experienceLevel,
        equipment,
        height,
        heightUnit,
        weight,
        weightUnit,
        birthday,
        mindfulAreas,
        goals,
        targetAreas,
        trainingFrequency,
        createdAt: new Date().toISOString(),
      });

      await regenerateWeeklySchedule(
        {
          name: name.trim(),
          experienceLevel,
          equipment,
          height,
          heightUnit,
          weight,
          weightUnit,
          birthday,
          mindfulAreas,
          goals,
          targetAreas,
          trainingFrequency,
        },
        new Set(),
        undefined,
        { shuffleTrainingDays: false }
      );

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err) {
      Alert.alert('Save failed', getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepLabel}>STEP 1 - ABOUT YOU</Text>
      <Text style={styles.heading}>Let&apos;s get to know you</Text>
      <Text style={styles.subtitle}>
        This helps reflo personalize your classes and resistance recommendations.
      </Text>

      <SectionLabel>YOUR NAME *</SectionLabel>
      <TextInput
        style={styles.input}
        placeholder="e.g. Joseph Pilates"
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <SectionLabel>EXPERIENCE LEVEL *</SectionLabel>
      <ThreeOptionToggle
        options={EXPERIENCE_OPTIONS}
        value={experienceLevel}
        onChange={setExperienceLevel}
      />

      <SectionLabel>EQUIPMENT ACCESS *</SectionLabel>
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
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepLabel}>STEP 2 - YOUR BODY</Text>
      <Text style={styles.heading}>Body Measurements</Text>
      <Text style={styles.subtitle}>
        Used to calculate spring resistance recommendations personalized to you.
      </Text>

      <SectionLabel>HEIGHT *</SectionLabel>
      <UnitToggle
        left="cm"
        right="ft"
        value={heightUnit}
        onChange={setHeightUnit}
      />
      <TextInput
        style={styles.input}
        placeholder="168"
        placeholderTextColor={theme.colors.textMuted}
        value={height}
        onChangeText={setHeight}
        keyboardType="numeric"
      />

      <SectionLabel>WEIGHT *</SectionLabel>
      <UnitToggle
        left="kg"
        right="lbs"
        value={weightUnit}
        onChange={setWeightUnit}
      />
      <TextInput
        style={styles.input}
        placeholder="62"
        placeholderTextColor={theme.colors.textMuted}
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
      />

      <SectionLabel>BIRTHDAY *</SectionLabel>
      <TextInput
        style={styles.input}
        placeholder="e.g. 02/29/2004"
        placeholderTextColor={theme.colors.textMuted}
        value={birthday}
        onChangeText={setBirthday}
      />

      <SectionLabel>ANY AREAS TO BE MINDFUL OF? *</SectionLabel>
      <View style={styles.chipWrap}>
        {MINDFUL_CHIPS.map((chip) => {
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
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepLabel}>STEP 3 - YOUR GOALS</Text>
      <Text style={styles.heading}>What would you like to focus on?</Text>
      <Text style={styles.subtitle}>
        Pick everything that applies. reflo will adjust your library and
        corrections around these.
      </Text>

      <SectionLabel>PRIMARY GOALS *</SectionLabel>
      <View style={styles.goalsGrid}>
        {GOALS.map((goal) => {
          const selected = goals.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              style={[styles.goalCard, selected && styles.goalCardSelected]}
              onPress={() =>
                setGoals((prev) => toggleSelection(prev, goal.id))
              }
            >
              <View style={styles.goalIcon} />
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalSubtitle}>{goal.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>TARGET AREAS *</SectionLabel>
      <View style={styles.chipWrap}>
        {TARGET_AREAS.map((area) => {
          const selected = targetAreas.includes(area);
          return (
            <Pressable
              key={area}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() =>
                setTargetAreas((prev) => toggleSelection(prev, area))
              }
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
                ]}
              >
                {area}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>HOW OFTEN DO YOU WANT TO TRAIN? *</SectionLabel>
      <Text style={styles.perWeekLabel}>per week</Text>
      <ThreeOptionToggle
        options={FREQUENCY_OPTIONS}
        value={trainingFrequency}
        onChange={setTrainingFrequency}
      />
    </>
  );

  return (
    <View style={styles.container}>
      <ProgressBar progress={progress} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? renderStep1() : null}
        {step === 2 ? renderStep2() : null}
        {step === 3 ? renderStep3() : null}
      </ScrollView>

      <View style={styles.footer}>
        {step < 3 ? (
          <Pressable
            style={[
              styles.nextButton,
              step === 1 && !canContinueStep1 && styles.nextButtonDisabled,
            ]}
            disabled={step === 1 && !canContinueStep1}
            onPress={() => setStep((prev) => prev + 1)}
          >
            <Text
              style={[
                styles.nextButtonText,
                step === 1 &&
                  !canContinueStep1 &&
                  styles.nextButtonTextDisabled,
              ]}
            >
              NEXT →
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.finishButton}
            onPress={handleFinish}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.finishButtonText}>FINISH →</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  input: {
    backgroundColor: theme.colors.white,
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    padding: scale(14),
    fontFamily: theme.fonts.body,
    fontSize: scale(15),
    color: theme.colors.textPrimary,
    marginBottom: scale(12),
  },
  progressTrack: {
    height: scale(2),
    flexDirection: 'row',
    backgroundColor: theme.colors.grey200,
    marginTop: scale(8),
  },
  progressFill: {
    height: scale(2),
    backgroundColor: theme.colors.red,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: scale(24),
    paddingBottom: scale(100),
  },
  stepLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    marginBottom: scale(6),
  },
  heading: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
    marginBottom: scale(8),
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(13),
    color: theme.colors.textMuted,
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  fieldLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    marginBottom: scale(8),
    marginTop: scale(12),
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: scale(6),
    marginBottom: scale(16),
  },
  toggleOption: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  toggleOptionText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(0.8),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  toggleOptionTextActive: {
    color: theme.colors.white,
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: scale(4),
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
    borderRadius: scale(4),
    backgroundColor: theme.colors.grey200,
    marginRight: scale(12),
  },
  equipmentLabel: {
    flex: 1,
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
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
    gap: scale(6),
    marginBottom: scale(8),
  },
  unitOption: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(4),
    borderWidth: scale(1),
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  unitOptionActive: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  unitOptionText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(0.8),
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  unitOptionTextActive: {
    color: theme.colors.white,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(16),
  },
  chip: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(4),
    backgroundColor: theme.colors.white,
    borderWidth: scale(1),
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.dark,
    borderColor: theme.colors.dark,
  },
  chipText: {
    fontFamily: theme.fonts.body,
    fontSize: scale(12),
    color: theme.colors.textMuted,
  },
  chipTextSelected: {
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.white,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginBottom: scale(16),
  },
  goalCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderRadius: scale(4),
    borderWidth: scale(0.5),
    borderColor: theme.colors.border,
    padding: scale(12),
    minHeight: scale(110),
  },
  goalCardSelected: {
    borderWidth: scale(1),
    borderColor: `${theme.colors.red}44`,
    backgroundColor: `${theme.colors.red}0a`,
  },
  goalIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(4),
    backgroundColor: theme.colors.grey200,
    marginBottom: scale(8),
  },
  goalTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(14),
    color: theme.colors.textPrimary,
    marginBottom: scale(4),
  },
  goalSubtitle: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
    color: theme.colors.textMuted,
    lineHeight: scale(14),
  },
  perWeekLabel: {
    fontFamily: theme.fonts.body,
    fontSize: scale(12),
    color: theme.colors.textMuted,
    marginBottom: scale(8),
    marginTop: scale(-4),
  },
  footer: {
    position: 'absolute',
    right: scale(20),
    bottom: scale(24),
  },
  nextButton: {
    backgroundColor: theme.colors.dark,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    paddingHorizontal: scale(24),
  },
  nextButtonDisabled: {
    backgroundColor: theme.colors.grey200,
  },
  nextButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
  nextButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  finishButton: {
    backgroundColor: theme.colors.red,
    borderRadius: scale(4),
    paddingVertical: scale(14),
    paddingHorizontal: scale(28),
    minWidth: scale(140),
    alignItems: 'center',
  },
  finishButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(11),
    letterSpacing: scale(1.6),
    textTransform: 'uppercase',
    color: theme.colors.white,
  },
});
