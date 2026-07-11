import type { ImageSourcePropType } from 'react-native';

export const DEMO_WORKOUT_ID = 'full-body-burn';

export type DifficultyLevel = 1 | 2 | 3;

export type LibraryWorkout = {
  id: string;
  title: string;
  category: 'Full Body' | 'Upper Body' | 'Lower Body' | 'Core';
  coverImage: ImageSourcePropType;
  workoutId: typeof DEMO_WORKOUT_ID;
  description: string;
  difficulty: DifficultyLevel;
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
    description:
      'Lengthen and tone with a balanced pilates reformer flow focused on flexibility and control.',
    difficulty: 2,
  },
  {
    id: 'lib-full-body-flow',
    title: 'Full Body Flow',
    category: 'Full Body',
    coverImage: covers.cover2,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'A smooth full-body sequence that links breath to movement for steady, controlled strength.',
    difficulty: 1,
  },
  {
    id: 'lib-full-body-sculpt',
    title: 'Full Body Sculpt',
    category: 'Full Body',
    coverImage: covers.cover3,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Sculpt long lines with precise reformer work targeting arms, core, and legs in one session.',
    difficulty: 3,
  },
  {
    id: 'lib-full-body-pulse',
    title: 'Full Body Pulse',
    category: 'Full Body',
    coverImage: covers.cover4,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Short pulses and holds that wake up the whole body without rushing through form.',
    difficulty: 2,
  },
  {
    id: 'lib-upper-body-sculpt',
    title: 'Upper Body Sculpt',
    category: 'Upper Body',
    coverImage: covers.cover3,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Open the chest and build shoulder stability with controlled arm and back sequences.',
    difficulty: 2,
  },
  {
    id: 'lib-upper-body-power',
    title: 'Upper Body Power',
    category: 'Upper Body',
    coverImage: covers.cover4,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Stronger presses and rows that challenge the upper body while keeping the core braced.',
    difficulty: 3,
  },
  {
    id: 'lib-upper-body-tone',
    title: 'Upper Body Tone',
    category: 'Upper Body',
    coverImage: covers.cover5,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Light spring work to tone arms and shoulders with an emphasis on clean alignment.',
    difficulty: 1,
  },
  {
    id: 'lib-upper-body-lift',
    title: 'Upper Body Lift',
    category: 'Upper Body',
    coverImage: covers.cover6,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Lift and lengthen through the upper back with flowing reformer patterns.',
    difficulty: 2,
  },
  {
    id: 'lib-lower-body-burn',
    title: 'Lower Body Burn',
    category: 'Lower Body',
    coverImage: covers.cover5,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Fire up the glutes and thighs with footwork and standing series that stay controlled.',
    difficulty: 3,
  },
  {
    id: 'lib-lower-body-strength',
    title: 'Lower Body Strength',
    category: 'Lower Body',
    coverImage: covers.cover6,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Build lower-body strength with deeper ranges and slower, intentional returns.',
    difficulty: 2,
  },
  {
    id: 'lib-lower-body-flow',
    title: 'Lower Body Flow',
    category: 'Lower Body',
    coverImage: covers.cover1,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'A gentler lower-body flow that prioritizes mobility, balance, and soft landings.',
    difficulty: 1,
  },
  {
    id: 'lib-lower-body-burnout',
    title: 'Lower Body Burnout',
    category: 'Lower Body',
    coverImage: covers.cover2,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'High-effort lower-body finishers designed to fatigue the legs with precise form.',
    difficulty: 3,
  },
  {
    id: 'lib-core-ignite',
    title: 'Core Ignite',
    category: 'Core',
    coverImage: covers.cover6,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Ignite deep core engagement with hundred variations and controlled flexion work.',
    difficulty: 2,
  },
  {
    id: 'lib-core-control',
    title: 'Core Control',
    category: 'Core',
    coverImage: covers.cover5,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Slow, precise core work that trains stability before adding range or speed.',
    difficulty: 1,
  },
  {
    id: 'lib-core-burn',
    title: 'Core Burn',
    category: 'Core',
    coverImage: covers.cover4,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'A focused core burn that layers holds, pulses, and anti-rotation challenges.',
    difficulty: 3,
  },
  {
    id: 'lib-core-power',
    title: 'Core Power',
    category: 'Core',
    coverImage: covers.cover3,
    workoutId: DEMO_WORKOUT_ID,
    description:
      'Powerful core sequences that connect breath, pelvis, and shoulder girdle as one unit.',
    difficulty: 2,
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
