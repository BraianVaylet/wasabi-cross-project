import { measureKindFor, type MeasureKind } from '@wasabi-cross/schemas';
import type { ManagedExerciseStore } from '../domain/managed-exercise-ports.ts';

/**
 * Lo que otros módulos pueden saber de un ejercicio gestionado: si es del usuario y qué
 * mide. Las marcas (F1-07) lo usan para validar el valor y responder 404 a uno ajeno sin
 * tocar el modelo de `exercises`.
 */
export async function findOwnedMeasure<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  managedExerciseId: string,
): Promise<{ managedExerciseId: string; kind: MeasureKind } | null> {
  const managed = await store.findManagedById(userId, managedExerciseId);
  if (!managed) {
    return null;
  }

  const exercise = await store.findExercise(managed.exerciseId);
  if (!exercise) {
    // Un ejercicio gestionado sin su definición es una base corrupta, no un caso de negocio.
    throw new Error(`Ejercicio gestionado ${managed.id} sin su ejercicio ${managed.exerciseId}`);
  }

  return { managedExerciseId: managed.id, kind: measureKindFor(exercise.category) };
}
