/**
 * Vercel serverless: compose a spoken class script + OpenAI TTS (once per workout).
 * Secret: OPENAI_API_KEY (never EXPO_PUBLIC_*).
 *
 * Called when the user taps Start on an AI / generated class — not per-frame.
 */

type VoiceExercise = {
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

/** TTS reads em dashes poorly — strip them and normalize spacing. */
function sanitizeForSpeech(text: string): string {
  return text
    .replace(/[\u2014\u2013—–-]+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .trim();
}

function formatRepsPhrase(exercise: VoiceExercise): string {
  const sets = typeof exercise.sets === 'number' ? exercise.sets : 1;
  const reps = typeof exercise.reps === 'number' ? exercise.reps : 0;
  const repType = exercise.repType === 'seconds' ? 'seconds' : 'count';

  if (repType === 'seconds') {
    if (sets <= 1) {
      return `Hold for about ${reps} seconds.`;
    }
    return `${sets} holds of about ${reps} seconds each.`;
  }

  if (sets <= 1) {
    return reps >= 50 ? `${reps} counts.` : `${reps} reps.`;
  }
  return `${sets} sets of ${reps}.`;
}

/**
 * Assemble a natural spoken class from workout data.
 * Flow: intro → each exercise (name, volume, cue, transition) → outro.
 */
export function buildClassScript(workout: VoiceWorkout): string {
  const title = sanitizeForSpeech(workout.title || 'your class');
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

  const parts: string[] = [];

  parts.push(
    `Welcome. Today's class is ${title}. Find your setup, take a breath, and we'll move with control.`
  );

  if (exercises.length === 0) {
    parts.push(
      `I'll guide you through the flow when you're ready. Listen for my cues, and stay connected to your form.`
    );
  } else {
    parts.push(
      `We have ${exercises.length} moves today. Stay with your breath, and I'll cue you through each one.`
    );
  }

  exercises.forEach((exercise, index) => {
    const name = sanitizeForSpeech(exercise.name || `Exercise ${index + 1}`);
    const cueRaw = typeof exercise.cue === 'string' ? exercise.cue : '';
    const cue = sanitizeForSpeech(cueRaw);
    const volume = formatRepsPhrase(exercise);
    const isLast = index === exercises.length - 1;

    parts.push(`Next up, ${name}. ${volume}`);

    if (cue) {
      parts.push(cue.endsWith('.') ? cue : `${cue}.`);
    }

    if (isLast) {
      parts.push(`Last move. Let's go.`);
    } else {
      parts.push(`Let's go.`);
    }
  });

  parts.push(
    `Beautiful work. That's the class. Take a moment to reset, roll your shoulders, and carry this focus with you.`
  );

  return parts.join(' ');
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

  let script: string;
  try {
    script = buildClassScript(workout);
  } catch (error) {
    console.error('[generate-voice] script build failed:', error);
    return res.status(500).json({ error: 'Could not build class script' });
  }

  if (!script.trim()) {
    return res.status(400).json({ error: 'Empty class script' });
  }

  // OpenAI TTS input limit is ~4096 characters; fail clearly if over.
  if (script.length > 4096) {
    console.error(
      `[generate-voice] script too long: ${script.length} characters (max 4096)`
    );
    return res.status(400).json({
      error: 'Script too long for TTS',
      scriptLength: script.length,
    });
  }

  console.log(
    `[generate-voice] generating audio for "${workout.title ?? 'untitled'}"`,
    {
      exerciseCount: workout.exercises.length,
      scriptLength: script.length,
    }
  );
  console.time('[generate-voice] tts');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'nova',
        input: script,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[generate-voice] OpenAI TTS error:', {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      console.timeEnd('[generate-voice] tts');
      return res.status(502).json({
        error: 'Voice generation failed',
        status: response.status,
      });
    }

    const audioBuffer = await response.arrayBuffer();
    console.timeEnd('[generate-voice] tts');

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('[generate-voice] empty audio buffer from OpenAI');
      return res.status(502).json({ error: 'Empty audio response' });
    }

    const base64 = Buffer.from(audioBuffer).toString('base64');

    console.log('[generate-voice] success', {
      scriptLength: script.length,
      audioBytes: audioBuffer.byteLength,
      base64Length: base64.length,
    });

    return res.status(200).json({
      audio: base64,
      format: 'mp3',
      scriptLength: script.length,
    });
  } catch (error) {
    console.timeEnd('[generate-voice] tts');
    console.error('[generate-voice] request failed:', error);
    return res.status(502).json({ error: 'Voice generation failed' });
  }
}
