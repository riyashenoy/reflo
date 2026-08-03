/**
 * Vercel serverless: AI weekly reformer plan (Haiku — low cost, JSON-capable).
 * Secret: ANTHROPIC_API_KEY (never EXPO_PUBLIC_*).
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { goals, frequency, experienceLevel, mindfulAreas } = req.body ?? {};

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        // Haiku for routine generation — fraction of Sonnet cost, JSON is more than enough.
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `You are a pilates instructor building a weekly reformer plan.

User profile:
- Goals: ${goals?.join(', ')}
- Training frequency: ${frequency} per week
- Experience: ${experienceLevel}
- Areas to be mindful of: ${mindfulAreas?.join(', ') || 'none'}

Available workout IDs (use ONLY these):
- "sculpt-and-stretch" — full body, flexibility, 5 min, medium
- "rest"

Return ONLY valid JSON, no markdown fences, no preamble:
{"monday":"...","tuesday":"...","wednesday":"...","thursday":"...","friday":"...","saturday":"...","sunday":"..."}

Respect the requested frequency. Space workout days apart rather than clustering them. Use "rest" for non-workout days.`,
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
      const plan = JSON.parse(text.replace(/```json|```/g, '').trim());
      return res.status(200).json({ plan });
    } catch {
      return res.status(500).json({ error: 'Could not parse plan' });
    }
  } catch (error) {
    console.error('[generate-plan] request failed:', error);
    return res.status(502).json({ error: 'Plan generation failed' });
  }
}
