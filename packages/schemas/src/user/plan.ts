import { z } from 'zod';

export const planSchema = z.enum(['free', 'max']);
export type Plan = z.infer<typeof planSchema>;
