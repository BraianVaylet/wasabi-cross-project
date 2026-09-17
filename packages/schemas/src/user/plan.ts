import { z } from 'zod';

export const planSchema = z.enum(['free', 'max']);
export type Plan = z.infer<typeof planSchema>;

/**
 * Límites por plan (spec §4). Viven acá, compartidos, porque el front los necesita para
 * mostrar "3 de 10" y el back para decidir si deja crear. Son datos, no la regla: quien
 * decide si se puede crear un ejercicio es el módulo `subscriptions` en el backend —
 * nunca el frontend.
 *
 * `null` es sin límite.
 */
export const PLAN_LIMITS = {
  free: { customExercises: 3, totalExercises: 10 },
  max: { customExercises: null, totalExercises: null },
} as const satisfies Record<
  Plan,
  { customExercises: number | null; totalExercises: number | null }
>;

export function limitsFor(plan: Plan): (typeof PLAN_LIMITS)[Plan] {
  return PLAN_LIMITS[plan];
}
