import {
  measureKindFor,
  type Capacity,
  type MeasureKind,
  type MuscleGroup,
} from '@wasabi-cross/schemas';
import type { ManagedExerciseStore } from '../domain/managed-exercise-ports.ts';

/**
 * Lo que otros módulos pueden saber de un ejercicio gestionado: si es del usuario, cómo se
 * llama y qué mide. Las marcas (F1-07) lo usan para validar el valor y responder 404 a uno
 * ajeno; las estadísticas (F2-04), además, para titular la serie. Ninguno de los dos toca
 * el modelo de `exercises`.
 */
export async function findOwnedMeasure<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  managedExerciseId: string,
): Promise<{ managedExerciseId: string; name: string; kind: MeasureKind } | null> {
  const managed = await store.findManagedById(userId, managedExerciseId);
  if (!managed) {
    return null;
  }

  const exercise = await store.findExercise(managed.exerciseId);
  if (!exercise) {
    // Un ejercicio gestionado sin su definición es una base corrupta, no un caso de negocio.
    throw new Error(`Ejercicio gestionado ${managed.id} sin su ejercicio ${managed.exerciseId}`);
  }

  return {
    managedExerciseId: managed.id,
    name: exercise.name,
    kind: measureKindFor(exercise.category),
  };
}

/**
 * La lista del usuario con lo que hace falta para agruparla: qué mide, qué capacidades y
 * qué grupos musculares. Lo usa el resumen general (F2-05) sin tocar el modelo de acá.
 */
export async function listOwnedProfiles<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
): Promise<
  {
    managedExerciseId: string;
    kind: MeasureKind;
    capacities: Capacity[];
    muscleGroups: MuscleGroup[];
  }[]
> {
  const managed = await store.listManaged(userId);
  const exercises = new Map(
    (await store.findExercisesByIds(managed.map((entry) => entry.exerciseId))).map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );

  return managed.map((entry) => {
    const exercise = exercises.get(entry.exerciseId);
    if (!exercise) {
      // Un ejercicio gestionado sin su definición es una base corrupta, no un caso de negocio.
      throw new Error(`Ejercicio gestionado ${entry.id} sin su ejercicio ${entry.exerciseId}`);
    }

    return {
      managedExerciseId: entry.id,
      kind: measureKindFor(exercise.category),
      capacities: [...exercise.capacities],
      muscleGroups: [...exercise.muscleGroups],
    };
  });
}
