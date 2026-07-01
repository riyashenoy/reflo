import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toDateKey, type WeeklyPlanDay } from '../../lib/workoutHistory';
import theme, { scale } from '../../theme';

export type CalendarDayVariant =
  | 'completed'
  | 'today'
  | 'scheduled'
  | 'missed'
  | 'rest';

export function resolveCalendarDayVariant(day: WeeklyPlanDay): CalendarDayVariant {
  if (day.isRestDay) {
    return 'rest';
  }
  if (day.status === 'completed') {
    return 'completed';
  }
  if (day.status === 'today') {
    return 'today';
  }
  if (day.status === 'missed') {
    return 'missed';
  }
  return 'scheduled';
}

function getStatusLine(day: WeeklyPlanDay, variant: CalendarDayVariant): string {
  if (variant === 'rest') {
    return 'Recovery · Rest and reset';
  }
  if (variant === 'completed') {
    return `Done · ${day.duration} min · Form Score ${day.formScore ?? 82}`;
  }
  if (variant === 'missed') {
    return `Missed · ${day.duration} min`;
  }
  return `Scheduled · ${day.duration} min`;
}

function getWorkoutTitle(day: WeeklyPlanDay, variant: CalendarDayVariant): string {
  if (variant === 'rest') {
    return 'REST DAY';
  }
  return day.workoutTitle.toUpperCase();
}

function StatusIcon({
  variant,
  isTodayRow,
}: {
  variant: CalendarDayVariant;
  isTodayRow: boolean;
}) {
  if (variant === 'rest') {
    return null;
  }

  if (variant === 'completed') {
    return (
      <View style={styles.iconCompleted}>
        <Text style={styles.iconCheckmark}>✓</Text>
      </View>
    );
  }

  if (variant === 'missed') {
    return <View style={styles.iconMissed} />;
  }

  if (isTodayRow) {
    return <View style={styles.iconToday} />;
  }

  return <View style={styles.iconScheduled} />;
}

type CalendarDayRowProps = {
  day: WeeklyPlanDay;
  showDivider?: boolean;
  onPress: () => void;
};

export function CalendarDayRow({
  day,
  showDivider = false,
  onPress,
}: CalendarDayRowProps) {
  const variant = resolveCalendarDayVariant(day);
  const todayKey = toDateKey(new Date());
  const isTodayRow = day.dateKey === todayKey;
  const dayLabel = isTodayRow ? `${day.dayName} · TODAY` : day.dayName;
  const isPressable = variant !== 'rest';
  const isRest = variant === 'rest';
  const isMissed = variant === 'missed';
  const isPastRest = isRest && day.dateKey < todayKey;

  const dayLabelColor = isTodayRow ? theme.colors.red : theme.colors.textSecondary;
  const titleColor = isPastRest
    ? theme.colors.grey400
    : theme.colors.textPrimary;
  const statusColor = isPastRest
    ? theme.colors.grey400
    : theme.colors.textSecondary;

  const content = (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <View
        style={[
          styles.row,
          isTodayRow && styles.rowToday,
          isMissed && styles.rowMissed,
        ]}
      >
        <View style={styles.rowContent}>
          <Text style={[styles.dayLabel, { color: dayLabelColor }]}>
            {dayLabel}
          </Text>
          <Text
            style={[
              styles.workoutTitle,
              {
                color: titleColor,
                fontFamily: isPastRest
                  ? theme.fonts.body
                  : theme.fonts.bodyMedium,
              },
            ]}
          >
            {getWorkoutTitle(day, variant)}
          </Text>
          <Text style={[styles.statusLine, { color: statusColor }]}>
            {getStatusLine(day, variant)}
          </Text>
        </View>
        <StatusIcon variant={variant} isTodayRow={isTodayRow} />
      </View>
    </>
  );

  if (!isPressable) {
    return <View>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(16),
  },
  rowToday: {
    backgroundColor: `${theme.colors.red}0a`,
    marginHorizontal: scale(-20),
    paddingHorizontal: scale(20),
  },
  rowMissed: {
    opacity: 0.5,
  },
  rowContent: {
    flex: 1,
    paddingRight: scale(12),
  },
  dayLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(10),
    letterSpacing: scale(0.88),
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  workoutTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: scale(15),
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  statusLine: {
    fontFamily: theme.fonts.body,
    fontSize: scale(12),
  },
  iconCompleted: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: theme.colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCheckmark: {
    color: theme.colors.white,
    fontSize: scale(14),
    fontWeight: '700',
  },
  iconScheduled: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: scale(1.5),
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  iconToday: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: scale(2),
    borderColor: theme.colors.red,
    backgroundColor: theme.colors.white,
  },
  iconMissed: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: scale(1.5),
    borderColor: theme.colors.grey400,
    backgroundColor: 'transparent',
  },
});
