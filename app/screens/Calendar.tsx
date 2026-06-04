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
import type { AppStackParamList } from '../navigation';

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
      contentContainerStyle={styles.scrollContent}
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
    backgroundColor: '#f2f0eb',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    fontFamily: 'Georgia',
    fontSize: 28,
    color: '#1a1a1a',
    flex: 1,
    paddingRight: 12,
  },
  editButton: {
    paddingTop: 4,
  },
  editIcon: {
    fontSize: 22,
    color: '#cc2200',
  },
  generateButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayList: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#00000014',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  dayRowToday: {
    backgroundColor: '#cc22000a',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dayRowContent: {
    flex: 1,
    paddingRight: 12,
  },
  dayLabel: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#00000055',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dayLabelToday: {
    color: '#cc2200',
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusLine: {
    fontSize: 12,
    color: '#00000055',
  },
  statusLineToday: {
    color: '#cc2200',
  },
  statusCircleCompleted: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCheckmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statusCircleEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8e6e0',
    backgroundColor: 'transparent',
  },
});
