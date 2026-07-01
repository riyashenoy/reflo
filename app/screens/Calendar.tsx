import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CalendarDayRow } from '../components/calendar/CalendarDayRow';
import { PressableScale } from '../components/motion';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import type { WeeklyPlanDay } from '../lib/workoutHistory';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function Calendar() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();
  const { weeklyPlan, isLoading, regenerateSchedule } = useWorkoutHistory();
  const [regenerating, setRegenerating] = useState(false);

  const handleGenerateSchedule = async () => {
    setRegenerating(true);
    try {
      await regenerateSchedule();
    } finally {
      setRegenerating(false);
    }
  };

  const handleEditFocus = () => {
    navigation.navigate('ProfileEdit', { section: 'focus' });
  };

  const handleDayPress = (day: WeeklyPlanDay) => {
    if (day.isRestDay) {
      return;
    }

    if (day.status === 'completed') {
      navigation.navigate('PostWorkout', { workoutId: day.workoutId });
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
          <Text style={styles.editIcon}>✎</Text>
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
  editIcon: {
    fontSize: scale(22),
    color: theme.colors.red,
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
