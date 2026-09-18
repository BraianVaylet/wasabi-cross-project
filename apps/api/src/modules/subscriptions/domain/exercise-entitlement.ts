import { limitsFor, type Plan } from '@wasabi-cross/schemas';

/** Cuántos ejercicios tiene un usuario en su lista, y cuántos de ellos son propios. */
export interface ExerciseUsage {
  readonly total: number;
  readonly custom: number;
}

export type AdditionDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly exceeded: 'total' | 'custom'; readonly max: number };

/**
 * ¿Puede este usuario agregar un ejercicio más? (spec §4)
 *
 * Free llega a 10 en total, y de esos, a 3 propios. Max no tiene límite. Los del catálogo
 * cuentan para el total pero no para los propios.
 *
 * Se compara con `>=` y no con `===`: un conteo por encima del límite —un usuario que
 * bajó de Max a Free, o datos anteriores al plan— tiene que seguir sin poder agregar.
 */
export function decideExerciseAddition(
  plan: Plan,
  usage: ExerciseUsage,
  isCustom: boolean,
): AdditionDecision {
  const limits = limitsFor(plan);

  // El total va primero: es el límite que el usuario ve en pantalla.
  if (limits.totalExercises !== null && usage.total >= limits.totalExercises) {
    return { allowed: false, exceeded: 'total', max: limits.totalExercises };
  }

  if (isCustom && limits.customExercises !== null && usage.custom >= limits.customExercises) {
    return { allowed: false, exceeded: 'custom', max: limits.customExercises };
  }

  return { allowed: true };
}
