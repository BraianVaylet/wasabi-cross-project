import type { Capacity, MeasureKind, MuscleGroup, SeriesPoint } from '@wasabi-cross/schemas';

/*
 * Puertos del módulo `stats` (F2-04). Como todo módulo, no conoce el modelo de los otros:
 * `exercises` le dice de quién es un ejercicio y cómo se llama, y `records` le da las
 * marcas. Los conecta la raíz de composición.
 */

/** Lo mínimo que `stats` necesita saber de un ejercicio gestionado para responder. */
export interface StatsExercise {
  readonly managedExerciseId: string;
  readonly name: string;
  readonly kind: MeasureKind;
}

/**
 * `null` si no existe o si es de otro usuario: las dos cosas se responden igual, así un
 * ID ajeno no confirma que exista (spec §13).
 */
export interface OwnedExerciseNameLookup {
  findOwned: (userId: string, managedExerciseId: string) => Promise<StatsExercise | null>;
}

/** Un ejercicio del usuario, con lo que hace falta para agruparlo (F2-05). */
export interface StatsExerciseProfile {
  readonly managedExerciseId: string;
  readonly kind: MeasureKind;
  readonly capacities: readonly Capacity[];
  readonly muscleGroups: readonly MuscleGroup[];
}

/** La lista completa del usuario, para el resumen general. La cumple `exercises`. */
export interface OwnedExercisesLookup {
  listOwned: (userId: string) => Promise<StatsExerciseProfile[]>;
}

export interface StatsRecordSource {
  /**
   * Las marcas del ejercicio desde `from` (inclusive), de la más vieja a la más reciente.
   * `from` en `null` es todo el historial.
   */
  series: (managedExerciseId: string, from: Date | null) => Promise<SeriesPoint[]>;
  /**
   * Lo mismo para varios de una vez: el resumen general mira toda la lista, y una consulta
   * por ejercicio sería una tormenta de consultas en un plan sin límite.
   */
  seriesFor: (
    managedExerciseIds: readonly string[],
    from: Date | null,
  ) => Promise<Map<string, SeriesPoint[]>>;
}
