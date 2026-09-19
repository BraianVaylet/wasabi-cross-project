import { z } from 'zod';
import { planSchema } from './plan.ts';

/**
 * Lo que responde `GET /api/v1/me`: quién es el usuario de la sesión. El front lo pide al
 * arrancar para saber si hay sesión y a quién saludar.
 */
export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  plan: planSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
