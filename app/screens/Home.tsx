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
import type { AppStackParamList } from '../navigation';

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

function getStreakDayStatus(dayIndex: number, todayIndex: number) {
  if (dayIndex < COMPLETED_DAY_COUNT) {
    return 'completed';
  }
  if (dayIndex === todayIndex) {
    return 'today';
  }
  if (dayIndex > todayIndex) {
    return 'future';
  }
  return 'past';
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
    <Pressable style={[styles.card, { width }]} onPress={onPress}>
      <View style={styles.cardImagePlaceholder} />
      <Text style={styles.cardTitle}>{workout.title.toUpperCase()}</Text>
    </Pressable>
  );
}

export default function Home() {
  const navigation = useNavigation<NavigationProp>();
  const [activeFilter, setActiveFilter] = useState<string>('Full Body');
  const todayIndex = new Date().getDay();

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
    <View style={styles.headerContent}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
      />

      <Text style={styles.heading}>Keep it Going.</Text>

      <View style={styles.streakRow}>
        {DAY_LABELS.map((label, index) => {
          const status = getStreakDayStatus(index, todayIndex);
          return (
            <View key={label} style={styles.streakDay}>
              <View
                style={[
                  styles.streakCircle,
                  status === 'completed' && styles.streakCircleCompleted,
                  status === 'today' && styles.streakCircleToday,
                  (status === 'future' || status === 'past') &&
                    styles.streakCircleFuture,
                ]}
              >
                {status === 'completed' ? (
                  <Text style={styles.streakCheckmark}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.streakLabel}>{label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionHeading}>Workout Library</Text>
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
    backgroundColor: '#f2f0eb',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  headerContent: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  logo: {
    width: 80,
    height: 40,
    resizeMode: 'contain',
  },
  heading: {
    fontFamily: 'Georgia',
    fontSize: 32,
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 20,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  streakDay: {
    alignItems: 'center',
  },
  streakCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  streakCircleCompleted: {
    backgroundColor: '#cc2200',
  },
  streakCircleToday: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cc2200',
  },
  streakCircleFuture: {
    backgroundColor: '#e8e6e0',
  },
  streakCheckmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 12,
    color: '#1a1a1a',
  },
  sectionHeading: {
    fontFamily: 'Georgia',
    fontSize: 22,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#1a1a1a',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e8e6e0',
  },
  filterPillActive: {
    backgroundColor: '#1a1a1a',
  },
  filterPillText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  cardRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e8e6e0',
  },
  cardTitle: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#1a1a1a',
    padding: 10,
    textTransform: 'uppercase',
  },
});
