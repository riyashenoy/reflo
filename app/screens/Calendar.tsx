import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import CorrectionToast from '../components/CorrectionToast';
import { EditPencilIcon } from '../components/EditPencilIcon';
import { CalendarDayRow } from '../components/calendar/CalendarDayRow';
import { WeeklyPlanEditSheet } from '../components/profile/WeeklyPlanEditSheet';
import { PressableScale } from '../components/motion';
import { auth } from '../lib/firebase';
import {
  fetchFirestoreWeeklyPlan,
  generateAndSaveWeeklyPlan,
  isPlanGenerationRateLimited,
} from '../lib/generatePlan';
import { fetchUserProfile, type UserProfile } from '../lib/userProfile';
import { useSessions } from '../hooks/useSessions';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import {
  toDateKey,
  type WeeklyPlanDay,
} from '../lib/workoutHistory';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function Calendar() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();
  const { weeklyPlan, isLoading, refresh } = useWorkoutHistory();
  const { sessions, refetch: refetchSessions } = useSessions();
  const [regenerating, setRegenerating] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [planEditVisible, setPlanEditVisible] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setProfile(null);
      setRateLimited(false);
      return;
    }

    try {
      const data = await fetchUserProfile(uid);
      setProfile(data);
    } catch (error) {
      console.warn('[Calendar] profile load failed:', error);
      setProfile(null);
    }

    try {
      const plan = await fetchFirestoreWeeklyPlan(uid);
      setRateLimited(isPlanGenerationRateLimited(plan?.lastGeneratedAt));
    } catch (error) {
      console.warn('[Calendar] plan load failed:', error);
      setRateLimited(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void refetchSessions();
    }, [loadProfile, refetchSessions])
  );

  const days = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const sessionsByDate = new Map(
      sessions.map((session) => [session.id, session])
    );

    return weeklyPlan.map((day): WeeklyPlanDay => {
      if (day.isRestDay) {
        return {
          ...day,
          status: day.dateKey === todayKey ? 'today' : day.status,
          isRestDay: true,
        };
      }

      const session = sessionsByDate.get(day.dateKey);
      if (session) {
        return {
          ...day,
          status: 'completed',
          duration: Math.max(1, Math.round(session.durationSeconds / 60)),
          correctionCount: session.correctionCount,
          formScore: undefined,
          isRestDay: false,
        };
      }

      if (day.dateKey === todayKey) {
        return { ...day, status: 'today', isRestDay: false };
      }

      if (day.dateKey > todayKey) {
        return { ...day, status: 'future', isRestDay: false };
      }

      // Past workout day with no session → missed
      return { ...day, status: 'missed', isRestDay: false };
    });
  }, [sessions, weeklyPlan]);

  const handleGenerateSchedule = async () => {
    if (rateLimited || regenerating) {
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setToastMessage('Sign in to generate a schedule.');
      return;
    }

    let activeProfile = profile;
    if (!activeProfile) {
      try {
        activeProfile = await fetchUserProfile(uid);
        setProfile(activeProfile);
      } catch {
        setToastMessage('Couldn’t load your profile.');
        return;
      }
    }

    if (!activeProfile) {
      setToastMessage('Complete your profile to generate a schedule.');
      return;
    }

    if (isPlanGenerationRateLimited(
      (await fetchFirestoreWeeklyPlan(uid))?.lastGeneratedAt
    )) {
      setRateLimited(true);
      return;
    }

    setRegenerating(true);
    try {
      const result = await generateAndSaveWeeklyPlan(uid, activeProfile);

      if (result.ok === false) {
        if (result.reason === 'rate_limited') {
          setRateLimited(true);
          return;
        }
        // Unauthenticated / no profile edge cases
        setToastMessage('Couldn’t build your plan. Try again later.');
        return;
      }

      setRateLimited(true);
      await refresh();
      await refetchSessions();
    } catch (error) {
      console.warn('[Calendar] generate failed:', error);
      setToastMessage('Couldn’t build your plan. Try again later.');
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
      generatedSlug: day.generatedSlug,
    });
  };

  return (
    <View style={styles.screen}>
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
          style={[
            styles.generateButton,
            (regenerating || rateLimited) && styles.generateButtonDisabled,
          ]}
          onPress={() => {
            void handleGenerateSchedule();
          }}
          disabled={regenerating || rateLimited}
        >
          {regenerating ? (
            <View style={styles.generateButtonInner}>
              <ActivityIndicator color={theme.colors.white} size="small" />
              <Text style={styles.generateButtonText}>Building your plan…</Text>
            </View>
          ) : rateLimited ? (
            <Text style={styles.generateButtonText}>
              You can regenerate next week
            </Text>
          ) : (
            <Text style={styles.generateButtonText}>
              ✦ GENERATE NEW SCHEDULE
            </Text>
          )}
        </PressableScale>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.colors.red} />
          </View>
        ) : (
          <View style={styles.dayList}>
            {days.map((day, index) => (
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

      <CorrectionToast
        message={toastMessage}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  generateButtonDisabled: {
    opacity: 0.75,
  },
  generateButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
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
    gap: 0,
  },
});
