import { z } from 'zod';

export const sessionEventSchema = z.object({
  exercise: z.string(),
  clipPlayed: z.string().optional().nullable(),
  timestamp: z.number().optional().nullable(),
  type: z.enum(['correction', 'positive', 'motivation']),
});

export const upsertSessionSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workoutId: z.string().nullable().optional(),
  workoutSource: z.enum(['recorded', 'generated', 'unknown']).optional(),
  completedAt: z.string().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  correctionCount: z.number().int().nonnegative().optional(),
  overallStars: z.number().int().min(0).max(5).nullable().optional(),
  ratings: z.record(z.string()).optional(),
  sessionLog: z.array(sessionEventSchema).optional(),
});

export type UpsertSessionInput = z.infer<typeof upsertSessionSchema>;
export type SessionEventInput = z.infer<typeof sessionEventSchema>;
