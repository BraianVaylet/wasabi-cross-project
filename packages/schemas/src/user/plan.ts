import { z } from 'zod';

export const planSchema = z.enum(['free', 'pro']);
export type Plan = z.infer<typeof planSchema>;
