import type { MeasureKind, SeriesPoint } from '@wasabi-cross/schemas';

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

export interface StatsRecordSource {
  /**
   * Las marcas del ejercicio desde `from` (inclusive), de la más vieja a la más reciente.
   * `from` en `null` es todo el historial.
   */
  series: (managedExerciseId: string, from: Date | null) => Promise<SeriesPoint[]>;
}
