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
        <Text style={styles.heading}>Your Weekly Plan.</Text>
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
    paddingBottom: scale(120),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: scale(16),
  },
  heading: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: scale(12),
  },
  editButton: {
    paddingTop: scale(4),
  },
  generateButton: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.full,
    paddingVertical: scale(12),
    paddingHorizontal: scale(18),
    marginBottom: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scale(44),
  },
  generateButtonText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  loadingState: {
    paddingVertical: scale(48),
    alignItems: 'center',
  },
  dayList: {
    width: '100%',
  },
});
