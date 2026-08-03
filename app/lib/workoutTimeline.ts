/**
 * Timeline builder for AI / generated voice workouts.
 * Timing constants are tunable — not for the flagship recorded basetrack.
 */

/** Controlled pilates rep (seconds). */
export const SECONDS_PER_REP = 3;
/** Rest between sets within one exercise. */
export const REST_BETWEEN_SETS_SEC = 5;
/** Quiet / setup before the user begins moving (also min slot for the spoken cue). */
export const SETUP_BUFFER_SEC = 4;
/** Correction window opens this many seconds into work. */
export const CORRECTION_LEAD_SEC = 5;
/** Correction window ends this many seconds before work ends. */
export const CORRECTION_TRAIL_SEC = 4;
/** Extra quiet after intro speech before first exercise cue. */
export const INTRO_GAP_SEC = 1;
/** Quiet after last exercise before outro speech. */
export const OUTRO_GAP_SEC = 2;
/** Skip button always seeks this many seconds from the end. */
export const SKIP_TAIL_SECONDS = 15;
/** Speech estimate: characters per second of coaching TTS. */
export const SPEECH_CHARS_PER_SEC = 13;

export type TimelineExerciseInput = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repType: 'count' | 'seconds';
  cue?: string;
};

export type TimelineSegment = {
  exerciseId: string;
  /** When the spoken cue begins (seconds from workout start). */
  cueStart: number;
  /** When the user begins moving (after cue + setup). */
  workStart: number;
  /** When this exercise's work time ends. */
  workEnd: number;
  /** Gap inside work for form corrections — never overlaps the next cue. */
  correctionWindow: { start: number; end: number };
};

export type WorkoutTimeline = {
  segments: TimelineSegment[];
  /** Intro speech starts at 0. */
  introStart: number;
  introEnd: number;
  /** Outro speech. */
  outroStart: number;
  outroEnd: number;
  /** Whole session length (source of truth for end + skip). */
  totalDurationSeconds: number;
};

export function estimateSpeechSeconds(text: string): number {
  const chars = text.trim().length;
  if (chars === 0) {
    return 0;
  }
  return Math.min(28, Math.max(3, Math.ceil(chars / SPEECH_CHARS_PER_SEC)));
}

/** Work duration for one exercise from sets / reps / repType. */
export function computeExerciseWorkSeconds(input: {
  sets: number;
  reps: number;
  repType: 'count' | 'seconds';
}): number {
  const sets = Math.max(1, Math.round(input.sets) || 1);
  const reps = Math.max(1, Math.round(input.reps) || 1);

  let active = 0;
  if (input.repType === 'seconds') {
    // reps IS the hold duration
    active = sets * reps;
  } else {
    active = sets * (reps * SECONDS_PER_REP);
  }

  const rest = Math.max(0, sets - 1) * REST_BETWEEN_SETS_SEC;
  return Math.max(6, active + rest);
}

function buildCorrectionWindow(
  workStart: number,
  workEnd: number
): { start: number; end: number } {
  const start = workStart + CORRECTION_LEAD_SEC;
  const end = workEnd - CORRECTION_TRAIL_SEC;
  if (end - start >= 4) {
    return { start, end };
  }
  // Short work blocks: middle third of the work period
  const span = Math.max(2, workEnd - workStart);
  const midStart = workStart + span * 0.33;
  const midEnd = workStart + span * 0.75;
  return {
    start: Math.max(workStart + 1, midStart),
    end: Math.min(workEnd - 0.5, midEnd),
  };
}

/**
 * Ordered timeline for a composed generated workout.
 * Cue speech estimates pad workStart so TTS never overlaps silent work —
 * client schedules clips at cueStart; work silence lasts until next cueStart.
 */
export function buildWorkoutTimeline(
  exercises: TimelineExerciseInput[],
  options?: {
    introSpeechSeconds?: number;
    outroSpeechSeconds?: number;
  }
): WorkoutTimeline {
  const introSpeech =
    options?.introSpeechSeconds ?? estimateSpeechSeconds(DEFAULT_INTRO_PLACEHOLDER);
  const outroSpeech =
    options?.outroSpeechSeconds ?? estimateSpeechSeconds(DEFAULT_OUTRO_PLACEHOLDER);

  const introStart = 0;
  const introEnd = introSpeech;
  let cursor = introEnd + INTRO_GAP_SEC;

  const segments: TimelineSegment[] = exercises.map((ex) => {
    const cueText = buildExerciseCueScript(ex);
    const cueSpeech = estimateSpeechSeconds(cueText);
    const cueStart = cursor;
    // User begins after the spoken cue; at least SETUP_BUFFER of announce/setup time
    const workStart = cueStart + Math.max(SETUP_BUFFER_SEC, cueSpeech);
    const workSeconds = computeExerciseWorkSeconds(ex);
    const workEnd = workStart + workSeconds;
    const correctionWindow = buildCorrectionWindow(workStart, workEnd);
    cursor = workEnd;
    return {
      exerciseId: ex.id,
      cueStart,
      workStart,
      workEnd,
      correctionWindow,
    };
  });

  const outroStart = cursor + OUTRO_GAP_SEC;
  const outroEnd = outroStart + outroSpeech;
  const totalDurationSeconds = outroEnd;

  return {
    segments,
    introStart,
    introEnd,
    outroStart,
    outroEnd,
    totalDurationSeconds,
  };
}

const DEFAULT_INTRO_PLACEHOLDER =
  "Welcome. Today's class is a focused flow. Find your setup, take a breath, and we will move with control. Stay with your breath.";

const DEFAULT_OUTRO_PLACEHOLDER =
  "Beautiful work. That is the class. Take a moment to reset, roll your shoulders, and carry this focus with you.";

/** TTS-safe text (no em dashes). */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/[\u2014\u2013—–-]+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .trim();
}

export function buildIntroScript(title: string, exerciseCount: number): string {
  const safeTitle = sanitizeForSpeech(title || 'your class');
  return [
    `Welcome. Today's class is ${safeTitle}.`,
    'Find your setup, take a breath, and we will move with control.',
    exerciseCount > 0
      ? `We have ${exerciseCount} moves today. Stay with your breath.`
      : 'Listen for my cues and stay connected to your form.',
  ].join(' ');
}

export function buildExerciseCueScript(ex: TimelineExerciseInput): string {
  const name = sanitizeForSpeech(ex.name || 'this exercise');
  const sets = Math.max(1, ex.sets || 1);
  const reps = Math.max(1, ex.reps || 1);
  const repType = ex.repType === 'seconds' ? 'seconds' : 'count';

  let volume = '';
  if (repType === 'seconds') {
    volume =
      sets <= 1
        ? `Hold for about ${reps} seconds.`
        : `${sets} holds of about ${reps} seconds each.`;
  } else if (sets <= 1) {
    volume = reps >= 50 ? `${reps} counts.` : `${reps} reps.`;
  } else {
    volume = `${sets} sets of ${reps}.`;
  }

  const cue = sanitizeForSpeech(ex.cue || '');
  const parts = [`Next up, ${name}.`, volume];
  if (cue) {
    parts.push(cue.endsWith('.') ? cue : `${cue}.`);
  }
  parts.push("Let's go.");
  return parts.join(' ');
}

export function buildOutroScript(): string {
  return 'Beautiful work. That is the class. Take a moment to reset, roll your shoulders, and carry this focus with you.';
}

/**
 * Rebuild timeline using measured / estimated speech durations for clips.
 * Prefer this after TTS text is known (uses exact script estimates).
 */
export function buildWorkoutTimelineFromScripts(
  exercises: TimelineExerciseInput[],
  introScript: string,
  outroScript: string
): WorkoutTimeline {
  return buildWorkoutTimeline(exercises, {
    introSpeechSeconds: estimateSpeechSeconds(introScript),
    outroSpeechSeconds: estimateSpeechSeconds(outroScript),
  });
}
