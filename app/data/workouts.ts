export type Intensity = 'low' | 'medium' | 'high';

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  cue: string;
  tracked: boolean;
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  duration: number;
  intensity: Intensity;
  tags: string[];
  aiTracked: boolean;
  exercises: Exercise[];
}

export const workouts: Workout[] = [
  {
    id: 'sculpt-and-stretch',
    title: 'Sculpt and stretch',
    description:
      'Lengthen and tone with a balanced pilates flow focused on flexibility and control.',
    duration: 20,
    intensity: 'medium',
    tags: ['full body', 'flexibility', 'pilates'],
    aiTracked: true,
    exercises: [
      {
        name: 'Spine Stretch Forward',
        sets: 2,
        reps: 8,
        cue: 'Round through the spine and reach forward from the hips.',
        tracked: true,
      },
      {
        name: 'Saw',
        sets: 2,
        reps: 8,
        cue: 'Rotate from the waist and reach pinky toward opposite pinky toe.',
        tracked: true,
      },
      {
        name: 'Mermaid',
        sets: 2,
        reps: 6,
        cue: 'Side bend with one hip anchored and ribs lifting away from the waist.',
        tracked: true,
      },
      {
        name: 'Swan Prep',
        sets: 2,
        reps: 8,
        cue: 'Extend through the upper back without compressing the lower back.',
        tracked: true,
      },
    ],
  },
  {
    id: 'full-body-burn',
    title: 'Full body burn',
    description:
      'High-intensity pilates flow targeting your entire body with AI-tracked form corrections.',
    duration: 15,
    intensity: 'high',
    tags: ['full body', 'cardio', 'pilates'],
    aiTracked: true,
    exercises: [
      {
        name: 'Hundred',
        sets: 1,
        reps: 100,
        cue: 'Pump arms vigorously while keeping core engaged and lower back pressed down.',
        tracked: true,
      },
      {
        name: 'Roll Up',
        sets: 2,
        reps: 8,
        cue: 'Articulate through the spine one vertebra at a time, arms reaching forward.',
        tracked: true,
      },
      {
        name: 'Single Leg Stretch',
        sets: 2,
        reps: 10,
        cue: 'Pull knee to chest while extending opposite leg at a 45-degree angle.',
        tracked: true,
      },
      {
        name: 'Plank to Pike',
        sets: 3,
        reps: 8,
        cue: 'Lift hips high while keeping shoulders stacked over wrists.',
        tracked: true,
      },
    ],
  },
  {
    id: 'core-ignite',
    title: 'Core ignite',
    description:
      'Fire up your deep core stabilizers with precision pilates movements and real-time tracking.',
    duration: 12,
    intensity: 'high',
    tags: ['core', 'abs', 'pilates'],
    aiTracked: true,
    exercises: [
      {
        name: 'Double Leg Stretch',
        sets: 2,
        reps: 10,
        cue: 'Circle arms overhead then hug knees in without arching the lower back.',
        tracked: true,
      },
      {
        name: 'Criss Cross',
        sets: 2,
        reps: 12,
        cue: 'Rotate from the ribcage, elbow reaching toward opposite knee.',
        tracked: true,
      },
      {
        name: 'Teaser',
        sets: 2,
        reps: 6,
        cue: 'Balance on sit bones with legs and torso forming a V-shape.',
        tracked: true,
      },
      {
        name: 'Side Plank',
        sets: 2,
        reps: 30,
        cue: 'Hold hips lifted in a straight line from head to heels.',
        tracked: true,
      },
    ],
  },
  {
    id: 'upper-body-sculpt',
    title: 'Upper body sculpt',
    description:
      'Tone arms, shoulders, and back with controlled pilates resistance work.',
    duration: 20,
    intensity: 'medium',
    tags: ['upper body', 'arms', 'shoulders'],
    aiTracked: false,
    exercises: [
      {
        name: 'Push Up',
        sets: 3,
        reps: 10,
        cue: 'Lower chest between hands, elbows at 45 degrees from ribs.',
        tracked: false,
      },
      {
        name: 'Swimming',
        sets: 2,
        reps: 20,
        cue: 'Lift opposite arm and leg, keeping gaze down and neck long.',
        tracked: false,
      },
      {
        name: 'Arm Circles',
        sets: 2,
        reps: 12,
        cue: 'Draw small controlled circles without shrugging shoulders.',
        tracked: false,
      },
      {
        name: 'Chest Expansion',
        sets: 2,
        reps: 10,
        cue: 'Reach arms back while keeping ribs closed and spine tall.',
        tracked: false,
      },
    ],
  },
  {
    id: 'lower-body-burn',
    title: 'Lower body burn',
    description:
      'Strengthen glutes, thighs, and calves with classic pilates lower-body sequences.',
    duration: 18,
    intensity: 'medium',
    tags: ['lower body', 'glutes', 'legs'],
    aiTracked: false,
    exercises: [
      {
        name: 'Bridge',
        sets: 3,
        reps: 12,
        cue: 'Press through heels and squeeze glutes at the top without over-arching.',
        tracked: false,
      },
      {
        name: 'Side Kick Series',
        sets: 2,
        reps: 10,
        cue: 'Keep hips stacked and kick leg forward and back with control.',
        tracked: false,
      },
      {
        name: 'Leg Pull Front',
        sets: 2,
        reps: 8,
        cue: 'Lift one leg behind you while maintaining a strong plank position.',
        tracked: false,
      },
      {
        name: 'Standing Footwork',
        sets: 2,
        reps: 12,
        cue: 'Rise onto balls of feet with weight evenly distributed.',
        tracked: false,
      },
    ],
  },
];

export function getWorkoutById(id: string): Workout | undefined {
  return workouts.find((w) => w.id === id);
}
