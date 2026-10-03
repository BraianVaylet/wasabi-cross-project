import { z } from 'zod';

export const planSchema = z.enum(['free', 'pro']);
export type Plan = z.infer<typeof planSchema>;

/**
 * Qué plan puede ver las estadísticas (spec §4): lo único que separa a Free de Pro. Vive acá,
 * compartida, porque el front la necesita para decidir si pide los datos o muestra el aviso y
 * el back para decidir si los entrega. Es el dato, no la garantía: quien hace cumplir la regla
 * es el módulo `subscriptions` en el backend — nunca el frontend.
 */
export function canViewStats(plan: Plan): boolean {
  return plan === 'pro';
}
