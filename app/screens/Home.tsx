import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { workouts, type Workout } from '../data/workouts';
import { useTabScreenTopPadding } from '../hooks/useTabScreenTopPadding';
import type { AppStackParamList } from '../navigation';
import theme from '../theme';

const FILTERS = ['Full Body', 'Upper Body', 'Lower Body', 'Core'] as const;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'Th', 'F', 'Sa'] as const;
const COMPLETED_DAY_COUNT = 3;
const HORIZONTAL_PADDING = 20;
const CARD_GAP = 12;

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

function matchesFilter(workout: Workout, activeFilter: string): boolean {
  const filterTag = activeFilter.toLowerCase();
  return workout.tags.some((tag) => tag.toLowerCase() === filterTag);
}

function getStreakDayStatus(dayIndex: number) {
  if (dayIndex < COMPLETED_DAY_COUNT) {
    return 'completed';
  }
  return 'incomplete';
}

function WorkoutCard({
  workout,
  width,
  onPress,
}: {
  workout: Workout;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.workoutCard, { width }]} onPress={onPress}>
      <View style={styles.cardImagePlaceholder} />
      <Text style={styles.cardTitle}>{workout.title.toUpperCase()}</Text>
    </Pressable>
  );
}

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const tabTopPadding = useTabScreenTopPadding();
  const [activeFilter, setActiveFilter] = useState<string>('Full Body');

  const filteredWorkouts = useMemo(() => {
    const matched = workouts.filter((workout) =>
      matchesFilter(workout, activeFilter)
    );
    return matched.length > 0 ? matched : workouts;
  }, [activeFilter]);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth =
    (screenWidth - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

  const renderHeader = () => (
    <View style={[styles.headerContent, { paddingTop: tabTopPadding }]}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.heading}>Keep it Going</Text>

      <View style={styles.streakRow}>
        {DAY_LABELS.map((label, index) => {
          const status = getStreakDayStatus(index);
          return (
            <View key={label} style={styles.streakDay}>
              <Text style={styles.streakLabel}>{label}</Text>
              <View
                style={[
                  styles.streakCircle,
                  status === 'completed'
                    ? styles.streakCircleCompleted
                    : styles.streakCircleIncomplete,
                ]}
              >
                {status === 'completed' ? (
                  <Text style={styles.streakCheckmark}>✓</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionHeading}>Workout Library</Text>

      <View style={styles.filterSection}>
        <Text style={styles.sectionSubtitle}>PICK YOUR WORKOUT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            width={cardWidth}
            onPress={() =>
              navigation.navigate('ClassDetail', { workoutId: item.id })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 120,
  },
  headerContent: {
    paddingBottom: 8,
  },
  logo: {
    width: 72,
    height: 36,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  heading: {
    ...theme.typography.header,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    marginBottom: 24,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 36,
    paddingHorizontal: 2,
  },
  streakDay: {
    alignItems: 'center',
    minWidth: 28,
  },
  streakLabel: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  streakCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCircleCompleted: {
    backgroundColor: theme.colors.red,
  },
  streakCircleIncomplete: {
    backgroundColor: theme.colors.grey200,
  },
  streakCheckmark: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    ...theme.typography.mediumHeader,
    fontFamily: theme.fonts.header,
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.grey200,
  },
  filterPillActive: {
    backgroundColor: theme.colors.dark,
  },
  filterPillText: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.white,
  },
  filterPillTextActive: {
    color: theme.colors.white,
  },
  cardRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  workoutCard: {
    marginBottom: 4,
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.grey200,
    borderRadius: theme.radius.sm,
    marginBottom: 10,
  },
  cardTitle: {
    ...theme.typography.label,
    fontFamily: theme.fonts.label,
    color: theme.colors.textPrimary,
    paddingHorizontal: 2,
  },
});
