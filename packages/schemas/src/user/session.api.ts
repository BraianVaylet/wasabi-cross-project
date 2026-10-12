import { z } from 'zod';
import { planSchema } from './plan.ts';

/**
 * Lo que responde `GET /api/v1/me`: quién es el usuario de la sesión. El front lo pide al
 * arrancar para saber si hay sesión y a quién saludar.
 *
 * De la foto sólo dice si hay (`hasPhoto`), nunca la URL del proveedor ni el _data URL_: pesa unos
 * 6 KB y el front la pide aparte, a `GET /api/v1/me/photo`, que la sirve desde el origen de la API
 * (F9-08, spec §5.6).
 */
export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  plan: planSchema,
  hasPhoto: z.boolean(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
