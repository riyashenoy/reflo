import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EditPencilIcon } from '../components/EditPencilIcon';
import { CalendarDayRow } from '../components/calendar/CalendarDayRow';
import { WeeklyPlanEditSheet } from '../components/profile/WeeklyPlanEditSheet';
import { PressableScale } from '../components/motion';
import { auth } from '../lib/firebase';
import { fetchUserProfile, type UserProfile } from '../lib/userProfile';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import type { WeeklyPlanDay } from '../lib/workoutHistory';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function Calendar() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();
  const { weeklyPlan, isLoading, regenerateSchedule, refresh } =
    useWorkoutHistory();
  const [regenerating, setRegenerating] = useState(false);
  const [planEditVisible, setPlanEditVisible] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setProfile(null);
      return;
    }

    const data = await fetchUserProfile(uid);
    setProfile(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const handleGenerateSchedule = async () => {
    setRegenerating(true);
    try {
      await regenerateSchedule();
    } finally {
      setRegenerating(false);
    }
  };

  const handleEditFocus = async () => {
    await loadProfile();
    setPlanEditVisible(true);
  };

  const handleDayPress = (day: WeeklyPlanDay) => {
    if (day.isRestDay) {
      return;
    }

    if (day.status === 'completed') {
      navigation.navigate('PostWorkout', {
        workoutId: day.workoutId,
        libraryId: day.libraryId,
        dateKey: day.dateKey,
        formScore: day.formScore,
        readOnly: true,
      });
      return;
    }

    navigation.navigate('ClassDetail', {
      libraryId: day.libraryId,
      workoutId: day.workoutId,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: tabTopPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>THIS WEEK</Text>
          <Text style={styles.heading}>Your weekly plan.</Text>
        </View>
        <PressableScale style={styles.editButton} hitSlop={8} onPress={handleEditFocus}>
          <EditPencilIcon />
        </PressableScale>
      </View>

      <PressableScale
        style={styles.generateButton}
        onPress={handleGenerateSchedule}
        disabled={regenerating}
      >
        {regenerating ? (
          <ActivityIndicator color={theme.colors.white} size="small" />
        ) : (
          <Text style={styles.generateButtonText}>✦ GENERATE NEW SCHEDULE</Text>
        )}
      </PressableScale>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={theme.colors.red} />
        </View>
      ) : (
        <View style={styles.dayList}>
          {weeklyPlan.map((day, index) => (
            <CalendarDayRow
              key={day.dateKey}
              day={day}
              showDivider={index > 0}
              onPress={() => handleDayPress(day)}
            />
          ))}
        </View>
      )}

      <WeeklyPlanEditSheet
        visible={planEditVisible}
        profile={profile}
        onClose={() => setPlanEditVisible(false)}
        onSaved={refresh}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(140),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(24),
  },
  headerText: {
    flex: 1,
    paddingRight: scale(12),
  },
  eyebrow: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(1.6),
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: scale(6),
  },
  heading: {
    fontFamily: theme.fonts.header,
    fontSize: scale(32),
    letterSpacing: scale(-1),
    color: theme.colors.textPrimary,
  },
  editButton: {
    paddingTop: scale(4),
  },
  generateButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.dark,
    borderRadius: scale(4),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    marginBottom: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.2),
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  loadingState: {
    paddingVertical: scale(48),
    alignItems: 'center',
  },
  dayList: {
    width: '100%',
  },
});
