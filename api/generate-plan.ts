/**
 * Vercel serverless: AI weekly plan + composed workouts (Haiku).
 * Secret: ANTHROPIC_API_KEY (never EXPO_PUBLIC_*).
 *
 * Catalog is inlined at build/request time from the client body when provided,
 * falling back to a server-side slim list if import fails on the function path.
 */

type CatalogItem = {
  id: string;
  name: string;
  equipment: string;
  targetAreas: string[];
  difficulty: string;
  tracked: boolean;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    goals,
    trainingFrequency,
    frequency,
    experienceLevel,
    mindfulAreas,
    equipment,
    exerciseCatalog,
  } = req.body ?? {};

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const catalog: CatalogItem[] = Array.isArray(exerciseCatalog)
    ? exerciseCatalog
    : [];

  const catalogJson = JSON.stringify(catalog);
  const frequencyLabel = trainingFrequency ?? frequency ?? '3-4x';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `You are a pilates instructor designing a personalized weekly reformer/mat plan.

User profile:
- Goals: ${Array.isArray(goals) ? goals.join(', ') : goals ?? 'general strength'}
- Training frequency: ${frequencyLabel} days per week
- Experience: ${experienceLevel ?? 'Beginner'}
- Areas to be mindful of: ${
              Array.isArray(mindfulAreas)
                ? mindfulAreas.join(', ') || 'none'
                : mindfulAreas || 'none'
            }
- Equipment: ${equipment ?? 'Reformer'}

Exercise library (use ONLY these exercise ids; each item includes equipment, targetAreas, difficulty, tracked):
${catalogJson}

Design the week:
1. Match training frequency (e.g. 4 days → 4 workout days + 3 rest). Space days intelligently; no more than 2 hard/advanced days back-to-back.
2. Each workout day gets type "workout", a workoutSlug (kebab-case), and you will define the workout in the workouts array.
3. Rest days: { "type": "rest" }.
4. For each workout day, compose 4–6 exercises matching that day's focus and the user's goals.
5. Respect experienceLevel for difficulty choices.
6. Avoid exercises that heavily load mindfulAreas (e.g. skip aggressive knee-loading work for Knee sensitivity).
7. Prefer equipment matching the user (reformer / mat / both).
8. Prefer including at least one tracked:true exercise per workout when it fits the focus.
9. Only use exercise ids from the library.
10. Prefer variation across the week (not the same 6 exercises every day).

Return ONLY valid JSON, no markdown fences, no preamble:
{
  "schedule": {
    "monday": { "type": "workout", "workoutSlug": "core-and-control" },
    "tuesday": { "type": "rest" },
    "wednesday": { "type": "workout", "workoutSlug": "lower-body-burn" },
    "thursday": { "type": "rest" },
    "friday": { "type": "workout", "workoutSlug": "full-body-flow" },
    "saturday": { "type": "rest" },
    "sunday": { "type": "workout", "workoutSlug": "mobility-reset" }
  },
  "workouts": [
    {
      "slug": "core-and-control",
      "title": "Core & Control",
      "focus": "core",
      "intensity": "medium",
      "exercises": [
        { "id": "the-hundred", "sets": 1, "reps": 100 },
        { "id": "criss-cross", "sets": 1, "reps": 12 }
      ]
    }
  ]
}

intensity must be "low" | "medium" | "high". focus should be a short label like core, legs, full-body, flexibility.
Every workoutSlug in schedule must match a slug in workouts. Include all 7 days monday–sunday.`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[generate-plan] Anthropic error:', data);
      return res.status(502).json({ error: 'Plan generation failed' });
    }

    const text = data.content?.[0]?.text ?? '';

    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      return res.status(200).json(parsed);
    } catch {
      return res.status(500).json({ error: 'Could not parse plan' });
    }
  } catch (error) {
    console.error('[generate-plan] request failed:', error);
    return res.status(502).json({ error: 'Plan generation failed' });
  }
}
