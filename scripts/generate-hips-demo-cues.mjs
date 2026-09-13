/**
 * One-off: generate two high-enthusiasm pilates cue MP3s via OpenAI TTS.
 * Usage: OPENAI_API_KEY=... node scripts/generate-hips-demo-cues.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets', 'audio', 'hips-demo');

const CLIPS = [
  {
    file: 'hips_rising.mp3',
    text: 'Your hips are rising — lower them!',
  },
  {
    file: 'great_form_plank.mp3',
    text: 'Great form — hold that plank!',
  },
];

const INSTRUCTIONS =
  'You are a high-energy pilates instructor coaching a client live. Sound warm, bright, and highly enthusiastic — clear and motivating, never flat or robotic. Keep a natural coaching cadence.';

async function synthesize(apiKey, text) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: text,
      instructions: INSTRUCTIONS,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI TTS failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }

  await mkdir(outDir, { recursive: true });

  for (const clip of CLIPS) {
    process.stdout.write(`Generating ${clip.file}… `);
    const audio = await synthesize(apiKey, clip.text);
    const outPath = path.join(outDir, clip.file);
    await writeFile(outPath, audio);
    console.log(`ok (${audio.length} bytes) → ${outPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
