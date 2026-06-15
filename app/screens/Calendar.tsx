import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { workouts } from '../data/workouts';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme, { scale } from '../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

type DayStatus = 'completed' | 'today' | 'future';

type WeekDayPlan = {
  dayIndex: number;
  dayName: string;
  status: DayStatus;
  workoutId: string;
  workoutTitle: string;
  duration: number;
};

const DAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const workout = workouts[0];

const WEEK_PLAN: WeekDayPlan[] = DAY_NAMES.map((dayName, dayIndex) => {
  let status: DayStatus = 'future';
  if (dayIndex <= 2) {
    status = 'completed';
  } else if (dayIndex === 3) {
    status = 'today';
  }

  return {
    dayIndex,
    dayName,
    status,
    workoutId: workout.id,
    workoutTitle: workout.title,
    duration: workout.duration,
  };
});

function StatusIcon({ status }: { status: DayStatus }) {
  if (status === 'completed') {
    return (
      <View style={styles.statusCircleCompleted}>
        <Text style={styles.statusCheckmark}>✓</Text>
      </View>
    );
  }

  return <View style={styles.statusCircleEmpty} />;
}

export default function Calendar() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();

  const handleGenerateSchedule = () => {
    Alert.alert('Coming soon', 'Schedule generation is not available yet.');
  };

  const handleDayPress = (day: WeekDayPlan) => {
    if (day.status === 'completed') {
      navigation.navigate('PostWorkout', { workoutId: day.workoutId });
      return;
    }

    navigation.navigate('ClassDetail', { workoutId: day.workoutId });
  };

  const getStatusLine = (day: WeekDayPlan) => {
    if (day.status === 'completed') {
      return `Done · ${day.duration} min · Form Score 82`;
    }
    if (day.status === 'today') {
      return `Up Next · ${day.duration} minutes`;
    }
    return `Scheduled · ${day.duration} min`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: tabTopPadding },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Your Weekly Plan.</Text>
        <Pressable style={styles.editButton} hitSlop={8}>
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
      </View>

      <Pressable style={styles.generateButton} onPress={handleGenerateSchedule}>
        <Text style={styles.generateButtonText}>✦ GENERATE NEW SCHEDULE</Text>
      </Pressable>

      <View style={styles.dayList}>
        {WEEK_PLAN.map((day, index) => {
          const isToday = day.status === 'today';
          const statusLine = getStatusLine(day);
          const dayLabel = isToday
            ? `${day.dayName} · TODAY`
            : day.dayName;

          return (
            <View key={day.dayName}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                style={[styles.dayRow, isToday && styles.dayRowToday]}
                onPress={() => handleDayPress(day)}
              >
                <View style={styles.dayRowContent}>
                  <Text
                    style={[
                      styles.dayLabel,
                      isToday && styles.dayLabelToday,
                    ]}
                  >
                    {dayLabel}
                  </Text>
                  <Text style={styles.workoutName}>
                    {day.workoutTitle.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.statusLine,
                      isToday && styles.statusLineToday,
                    ]}
                  >
                    {statusLine}
                  </Text>
                </View>
                <StatusIcon status={day.status} />
              </Pressable>
            </View>
          );
        })}
      </View>
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
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.dark,
    borderRadius: theme.radius.full,
    paddingVertical: scale(12),
    paddingHorizontal: scale(18),
    marginBottom: scale(24),
  },
  generateButtonText: {
    ...theme.typography.label,
    color: theme.colors.white,
  },
  dayList: {
    marginTop: scale(4),
  },
  divider: {
    height: scale(1),
    backgroundColor: theme.colors.border,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(16),
  },
  dayRowToday: {
    backgroundColor: `${theme.colors.red}0a`,
    marginHorizontal: scale(-20),
    paddingHorizontal: scale(20),
  },
  dayRowContent: {
    flex: 1,
    paddingRight: scale(12),
  },
  dayLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: scale(4),
  },
  dayLabelToday: {
    color: theme.colors.red,
  },
  workoutName: {
    ...theme.typography.body,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  statusLine: {
    ...theme.typography.body,
    fontSize: scale(12),
    color: theme.colors.textSecondary,
  },
  statusLineToday: {
    color: theme.colors.textSecondary,
  },
  statusCircleCompleted: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: theme.colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCheckmark: {
    color: theme.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
  },
  statusCircleEmpty: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: theme.colors.grey200,
  },
});
