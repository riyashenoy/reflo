import type { ImageSourcePropType } from 'react-native';

export const DEMO_WORKOUT_ID = 'full-body-burn';

export type LibraryWorkout = {
  id: string;
  title: string;
  category: 'Full Body' | 'Upper Body' | 'Lower Body' | 'Core';
  coverImage: ImageSourcePropType;
  workoutId: typeof DEMO_WORKOUT_ID;
};

const covers = {
  cover1: require('../../assets/images/cover/cover1.jpg'),
  cover2: require('../../assets/images/cover/cover2.jpg'),
  cover3: require('../../assets/images/cover/cover3.jpg'),
  cover4: require('../../assets/images/cover/cover4.jpg'),
  cover5: require('../../assets/images/cover/cover5.jpg'),
  cover6: require('../../assets/images/cover/cover6.jpg'),
} as const;

export const libraryWorkouts: LibraryWorkout[] = [
  {
    id: 'lib-full-body-burn',
    title: 'Full Body Burn',
    category: 'Full Body',
    coverImage: covers.cover1,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-full-body-flow',
    title: 'Full Body Flow',
    category: 'Full Body',
    coverImage: covers.cover2,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-full-body-sculpt',
    title: 'Full Body Sculpt',
    category: 'Full Body',
    coverImage: covers.cover3,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-full-body-pulse',
    title: 'Full Body Pulse',
    category: 'Full Body',
    coverImage: covers.cover4,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-upper-body-sculpt',
    title: 'Upper Body Sculpt',
    category: 'Upper Body',
    coverImage: covers.cover3,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-upper-body-power',
    title: 'Upper Body Power',
    category: 'Upper Body',
    coverImage: covers.cover4,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-upper-body-tone',
    title: 'Upper Body Tone',
    category: 'Upper Body',
    coverImage: covers.cover5,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-upper-body-lift',
    title: 'Upper Body Lift',
    category: 'Upper Body',
    coverImage: covers.cover6,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-lower-body-burn',
    title: 'Lower Body Burn',
    category: 'Lower Body',
    coverImage: covers.cover5,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-lower-body-strength',
    title: 'Lower Body Strength',
    category: 'Lower Body',
    coverImage: covers.cover6,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-lower-body-flow',
    title: 'Lower Body Flow',
    category: 'Lower Body',
    coverImage: covers.cover1,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-lower-body-burnout',
    title: 'Lower Body Burnout',
    category: 'Lower Body',
    coverImage: covers.cover2,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-core-ignite',
    title: 'Core Ignite',
    category: 'Core',
    coverImage: covers.cover6,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-core-control',
    title: 'Core Control',
    category: 'Core',
    coverImage: covers.cover5,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-core-burn',
    title: 'Core Burn',
    category: 'Core',
    coverImage: covers.cover4,
    workoutId: DEMO_WORKOUT_ID,
  },
  {
    id: 'lib-core-power',
    title: 'Core Power',
    category: 'Core',
    coverImage: covers.cover3,
    workoutId: DEMO_WORKOUT_ID,
  },
];

export function getLibraryWorkout(id: string): LibraryWorkout | undefined {
  return libraryWorkouts.find((item) => item.id === id);
}

export function getLibraryWorkoutForDemo(
  libraryId?: string,
  workoutId?: string
): LibraryWorkout | undefined {
  if (libraryId) {
    return getLibraryWorkout(libraryId);
  }
  if (workoutId) {
    return libraryWorkouts.find((item) => item.workoutId === workoutId);
  }
  return undefined;
}

export function getLibraryWorkoutsForFilter(
  filter: string,
  savedIds: string[]
): LibraryWorkout[] {
  if (filter === 'Saved') {
    return libraryWorkouts.filter((item) => savedIds.includes(item.id));
  }

  return libraryWorkouts.filter(
    (item) => item.category.toLowerCase() === filter.toLowerCase()
  );
}
