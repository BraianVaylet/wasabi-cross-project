import type { Mark, MeasureKind, RecordEntry } from '@wasabi-cross/schemas';

/*
 * Puertos del módulo `records` (F1-07). `OwnedExerciseLookup` lo cumple `exercises`, que
 * es el dueño de los ejercicios gestionados; se conectan en la raíz de composición.
 */

/**
 * ¿Este ejercicio gestionado es de este usuario, y qué mide? `null` si no existe o si es
 * de otro: las dos cosas se responden igual (spec §13).
 */
export interface OwnedExerciseLookup {
  findOwned: (
    userId: string,
    managedExerciseId: string,
  ) => Promise<{ managedExerciseId: string; kind: MeasureKind } | null>;
}

/** Posición exacta en el historial: fecha de realización, alta e ID desempatan. */
export interface HistoryCursor {
  performedAt: string;
  createdAt: string;
  id: string;
}

export interface NewRecordEntry {
  userId: string;
  managedExerciseId: string;
  kind: MeasureKind;
  value: number;
  performedAt: string;
  notes?: string;
  /** Sólo en hipertrofia (`kind: 'weighted_reps'`), junto a las repeticiones. */
  weightKg?: number;
  /** Sólo en running (`kind: 'time'`), junto al tiempo. Plano es 0, no ausente. */
  elevationGainM?: number;
}

export interface RecordStore {
  append: (record: NewRecordEntry) => Promise<RecordEntry>;
  /** La marca de fecha de realización más reciente (spec §5.1). */
  current: (managedExerciseId: string) => Promise<Mark | null>;
  /** La mayor (la menor, en tiempo); si se repite, la primera vez que se logró. */
  best: (managedExerciseId: string, kind: MeasureKind) => Promise<Mark | null>;
  page: (
    managedExerciseId: string,
    limit: number,
    after: HistoryCursor | undefined,
  ) => Promise<{ records: (RecordEntry & { createdAt: string })[]; hasMore: boolean }>;
}
