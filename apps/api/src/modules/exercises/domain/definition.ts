import type { Exercise, ExerciseDefinitionInput } from '@wasabi-cross/schemas';
import { sameName } from './names.ts';

/** Mismos elementos, sin importar el orden. `undefined` (un documento viejo) no es igual a nada. */
export function sameSet(
  stored: readonly string[] | undefined,
  expected: readonly string[],
): boolean {
  if (!stored) {
    return false;
  }

  return (
    stored.length === expected.length &&
    [...stored].sort().join('|') === [...expected].sort().join('|')
  );
}

/**
 * ¿El formulario dejó la definición de un precargado tal cual? Es lo que decide si se agrega
 * el del catálogo o se crea un propio con lo editado (spec §5.3, ADR-0009).
 *
 * El nombre se compara como en todo el resto (sin mayúsculas ni acentos): escribir "snatch"
 * no es editar "Snatch". Los secundarios y las listas se comparan como conjuntos: el orden
 * en que se tildaron no es una edición.
 */
export function sameDefinition(exercise: Exercise, input: ExerciseDefinitionInput): boolean {
  const secondaries = exercise.muscleGroups.filter(
    (group) => group !== exercise.primaryMuscleGroup,
  );

  return (
    sameName(exercise.name, input.name) &&
    exercise.category === input.category &&
    exercise.primaryMuscleGroup === input.primaryMuscleGroup &&
    exercise.equipment === input.equipment &&
    sameSet(exercise.capacities, input.capacities) &&
    sameSet(secondaries, input.secondaryMuscleGroups) &&
    sameSet(exercise.disciplines, input.disciplines)
  );
}
