/**
 * Vercel serverless: per-cue OpenAI TTS for timed generated classes.
 * Secret: OPENAI_API_KEY (never EXPO_PUBLIC_*).
 *
 * Returns discrete clips + a computed timeline. Client schedules playback
 * at cueStart so users get real silent work time between announcements.
 * (OpenAI TTS cannot bake multi-minute silences into one MP3 cleanly.)
 */

import {
  buildExerciseCueScript,
  buildIntroScript,
  buildOutroScript,
  buildWorkoutTimelineFromScripts,
  estimateSpeechSeconds,
  type TimelineExerciseInput,
} from '../app/lib/workoutTimeline';

type VoiceExercise = {
  id?: string;
  name?: string;
  sets?: number;
  reps?: number;
  cue?: string;
  repType?: 'count' | 'seconds';
};

type VoiceWorkout = {
  title?: string;
  exercises?: VoiceExercise[];
};

async function synthesizeSpeech(
  apiKey: string,
  input: string
): Promise<ArrayBuffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'nova',
      input,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const err = new Error(
      `OpenAI TTS failed (${response.status}): ${errorText.slice(0, 200)}`
    );
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  return response.arrayBuffer();
}

function normalizeExercises(raw: VoiceExercise[]): TimelineExerciseInput[] {
  return raw.map((ex, index) => ({
    id:
      typeof ex.id === 'string' && ex.id.trim()
        ? ex.id.trim()
        : `exercise-${index + 1}`,
    name: typeof ex.name === 'string' ? ex.name : `Exercise ${index + 1}`,
    sets: typeof ex.sets === 'number' ? ex.sets : 1,
    reps: typeof ex.reps === 'number' ? ex.reps : 8,
    repType: ex.repType === 'seconds' ? 'seconds' : 'count',
    cue: typeof ex.cue === 'string' ? ex.cue : '',
  }));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('[generate-voice] OPENAI_API_KEY is not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const workout: VoiceWorkout = req.body?.workout ?? req.body ?? {};

  if (!workout || typeof workout !== 'object') {
    return res.status(400).json({ error: 'Missing workout payload' });
  }

  if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) {
    return res.status(400).json({ error: 'Workout must include exercises' });
  }

  const exercises = normalizeExercises(workout.exercises);
  const introScript = buildIntroScript(
    workout.title || 'your class',
    exercises.length
  );
  const outroScript = buildOutroScript();
  const exerciseScripts = exercises.map((ex) => buildExerciseCueScript(ex));

  // Full-session timeline with spaced work blocks (client clocks against this)
  const timeline = buildWorkoutTimelineFromScripts(
    exercises,
    introScript,
    outroScript
  );

  const jobs: Array<{ key: string; start: number; script: string }> = [
    { key: 'intro', start: timeline.introStart, script: introScript },
    ...exercises.map((ex, i) => ({
      key: ex.id,
      start: timeline.segments[i]?.cueStart ?? 0,
      script: exerciseScripts[i],
    })),
    { key: 'outro', start: timeline.outroStart, script: outroScript },
  ];

  for (const job of jobs) {
    if (job.script.length > 4096) {
      return res.status(400).json({
        error: 'Script segment too long for TTS',
        key: job.key,
        scriptLength: job.script.length,
      });
    }
  }

  console.log(
    `[generate-voice] generating ${jobs.length} timed clips for "${workout.title ?? 'untitled'}"`,
    {
      exerciseCount: exercises.length,
      totalDurationSeconds: timeline.totalDurationSeconds,
      segments: timeline.segments.map((s) => ({
        id: s.exerciseId,
        cueStart: s.cueStart,
        workStart: s.workStart,
        workEnd: s.workEnd,
        correction: s.correctionWindow,
      })),
    }
  );
  console.time('[generate-voice] tts');

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    // Parallel TTS — one clip per segment, not one continuous concatenation
    const buffers = await Promise.all(
      jobs.map(async (job) => {
        const buf = await synthesizeSpeech(apiKey, job.script);
        return { job, buf };
      })
    );
    console.timeEnd('[generate-voice] tts');

    const clips = buffers.map(({ job, buf }) => {
      if (!buf || buf.byteLength === 0) {
        throw new Error(`Empty audio for clip ${job.key}`);
      }
      return {
        key: job.key,
        start: job.start,
        estimatedSpeechSeconds: estimateSpeechSeconds(job.script),
        audio: Buffer.from(buf).toString('base64'),
      };
    });

    console.log('[generate-voice] success', {
      clips: clips.length,
      totalDurationSeconds: timeline.totalDurationSeconds,
      audioBytes: buffers.reduce((n, b) => n + b.buf.byteLength, 0),
    });

    return res.status(200).json({
      format: 'mp3',
      timeline,
      totalDurationSeconds: timeline.totalDurationSeconds,
      clips,
      // Legacy single-field unused — kept empty so old clients fail clearly
      audio: null,
    });
  } catch (error) {
    console.timeEnd('[generate-voice] tts');
    console.error('[generate-voice] request failed:', error);
    return res.status(502).json({
      error: 'Voice generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
