import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toDateKey, type WeeklyPlanDay } from '../../lib/workoutHistory';
import theme, { scale } from '../../theme';

const WARM_RULE = '#E4E2DD';
const MARKER_SIZE = scale(16);
const MOTIF_SIZE = scale(4);

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
    return `Done · ${day.duration} min · Form ${day.formScore ?? 82}`;
  }
  if (variant === 'missed') {
    return `Missed · ${day.duration} min`;
  }
  return `Scheduled · ${day.duration} min`;
}

function getWorkoutTitle(day: WeeklyPlanDay, variant: CalendarDayVariant): string {
  if (variant === 'rest') {
    return 'Rest day';
  }
  return day.workoutTitle.toUpperCase();
}

function StatusMarker({
  variant,
}: {
  variant: CalendarDayVariant;
}) {
  if (variant === 'rest') {
    return null;
  }

  if (variant === 'completed') {
    return (
      <View style={styles.markerCompleted}>
        <Text style={styles.markerCheck}>✓</Text>
      </View>
    );
  }

  if (variant === 'missed') {
    return <View style={styles.markerMissed} />;
  }

  return <View style={styles.markerScheduled} />;
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
  const isPressable = variant !== 'rest';
  const isRest = variant === 'rest';
  const isMissed = variant === 'missed';
  const isPastRest = isRest && day.dateKey < todayKey;

  const dayLabelColor = isTodayRow ? theme.colors.red : theme.colors.textMuted;
  const titleColor = isRest
    ? theme.colors.textMuted
    : isPastRest
      ? theme.colors.textMuted
      : theme.colors.textPrimary;
  const statusColor = theme.colors.textMuted;

  const content = (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <View style={[styles.row, isMissed && styles.rowMissed]}>
        <View style={styles.rowContent}>
          <View style={styles.dayLabelRow}>
            {isTodayRow ? <View style={styles.todayMotif} /> : null}
            <Text style={[styles.dayLabel, { color: dayLabelColor }]}>
              {day.dayName.toUpperCase()}
            </Text>
          </View>
          <Text
            style={[
              styles.workoutTitle,
              isRest && styles.workoutTitleRest,
              { color: titleColor },
            ]}
          >
            {getWorkoutTitle(day, variant)}
          </Text>
          <Text style={[styles.statusLine, { color: statusColor }]}>
            {getStatusLine(day, variant)}
          </Text>
        </View>
        <StatusMarker variant={variant} />
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
    height: scale(0.5),
    backgroundColor: WARM_RULE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(16),
  },
  rowMissed: {
    opacity: 0.5,
  },
  rowContent: {
    flex: 1,
    paddingRight: scale(12),
  },
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  todayMotif: {
    width: MOTIF_SIZE,
    height: MOTIF_SIZE,
    borderRadius: MOTIF_SIZE / 2,
    backgroundColor: theme.colors.red,
    marginRight: scale(6),
  },
  dayLabel: {
    fontFamily: theme.fonts.label,
    fontSize: scale(9),
    letterSpacing: scale(1.4),
    textTransform: 'uppercase',
  },
  workoutTitle: {
    fontFamily: theme.fonts.label,
    fontSize: scale(12),
    letterSpacing: scale(0.6),
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  workoutTitleRest: {
    textTransform: 'none',
    letterSpacing: 0,
  },
  statusLine: {
    fontFamily: theme.fonts.body,
    fontSize: scale(11),
  },
  markerCompleted: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    backgroundColor: theme.colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerCheck: {
    color: theme.colors.white,
    fontSize: scale(10),
    fontWeight: '700',
    lineHeight: scale(12),
  },
  markerScheduled: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderWidth: scale(1),
    borderColor: theme.colors.grey200,
    backgroundColor: 'transparent',
  },
  markerMissed: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderWidth: scale(1),
    borderColor: theme.colors.grey200,
    backgroundColor: 'transparent',
  },
});
