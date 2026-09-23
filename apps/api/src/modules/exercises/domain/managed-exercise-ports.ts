import type {
  BodySegment,
  Capacity,
  Exercise,
  ExerciseCategory,
  Level,
  MuscleGroup,
  ManagedExercise,
  MeasureKind,
  Plan,
} from '@wasabi-cross/schemas';

/*
 * Puertos del alta y la lista de ejercicios gestionados (F1-05). `Tx` es la transacción,
 * genérica: ni el dominio ni la aplicación saben que del otro lado hay Mongo.
 *
 * Dos de estos puertos los cumplen otros módulos, y se conectan en la raíz de composición:
 * `ExerciseSlots` lo cumple `subscriptions` (el cupo del plan) y `RecordsGateway` lo cumple
 * `records` (las marcas). Ningún módulo importa a otro.
 */

export interface ExerciseSlots<Tx> {
  withSlot: <T>(
    request: { userId: string; plan: Plan; isCustom: boolean },
    work: (tx: Tx) => Promise<T>,
  ) => Promise<T>;
}

export interface CurrentValue {
  readonly value: number;
  readonly unit: 'kg' | 'reps' | 's';
  readonly performedAt: string;
  readonly weightKg?: number | undefined;
  readonly elevationGainM?: number | undefined;
}

export interface NewRecord {
  userId: string;
  managedExerciseId: string;
  kind: MeasureKind;
  value: number;
  performedAt: string;
  notes?: string;
  weightKg?: number;
  elevationGainM?: number;
}

export interface RecordsGateway<Tx> {
  /** Guarda la primera marca dentro de la transacción del alta. */
  logFirst: (tx: Tx, record: NewRecord) => Promise<CurrentValue>;
  /** Valor actual (la marca de fecha más reciente) de cada ejercicio gestionado. */
  currentFor: (managedExerciseIds: readonly string[]) => Promise<ReadonlyMap<string, CurrentValue>>;
  /** Borra todas las marcas de un ejercicio gestionado. Devuelve cuántas borró. */
  deleteAllFor: (tx: Tx, managedExerciseId: string) => Promise<number>;
}

/** Corre algo todo o nada. Para operaciones de varios documentos que no consumen cupo. */
export interface TransactionRunner<Tx> {
  run: <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;
}

/** Cambios sobre un ejercicio gestionado. `notes: null` borra los comentarios. */
export interface ManagedExercisePatch {
  level?: Level;
  withPain?: boolean;
  notes?: string | null;
}

export interface NewManagedExercise {
  userId: string;
  exerciseId: string;
  level: Level;
  withPain: boolean;
  notes?: string;
}

/** Un ejercicio propio, tal como se guarda: el segmento ya viene derivado (spec §5.1). */
export interface NewCustomExercise {
  readonly ownerId: string;
  readonly name: string;
  readonly category: ExerciseCategory;
  readonly capacities: readonly Capacity[];
  readonly muscleGroups: readonly MuscleGroup[];
  readonly bodySegment: BodySegment;
}

export interface ManagedExerciseStore<Tx> {
  findExercise: (id: string) => Promise<Exercise | null>;
  findExercisesByIds: (ids: readonly string[]) => Promise<Exercise[]>;
  findCatalog: () => Promise<Exercise[]>;
  findCustomsOf: (userId: string) => Promise<Exercise[]>;
  findManaged: (userId: string, exerciseId: string) => Promise<ManagedExercise | null>;
  /**
   * Busca por ID **y** dueño. No hay forma de pedir un ejercicio gestionado sin decir de
   * quién: así un ID ajeno da lo mismo que uno inexistente, por construcción (spec §13).
   */
  findManagedById: (userId: string, id: string) => Promise<ManagedExercise | null>;
  listManaged: (userId: string) => Promise<ManagedExercise[]>;
  /** Tira `WC-EXO-409-003` si el índice único detecta un duplicado (carrera). */
  createCustom: (tx: Tx, exercise: NewCustomExercise) => Promise<Exercise>;
  /** Tira `WC-EXO-409-003` si el índice único detecta un duplicado (carrera). */
  createManaged: (tx: Tx, managed: NewManagedExercise) => Promise<ManagedExercise>;
  updateManaged: (
    tx: Tx,
    id: string,
    userId: string,
    patch: ManagedExercisePatch,
  ) => Promise<ManagedExercise>;
  /** Sólo propios. Tira `WC-EXO-409-003` si el índice único detecta un duplicado (carrera). */
  renameCustom: (tx: Tx, exerciseId: string, ownerId: string, name: string) => Promise<Exercise>;
  deleteManaged: (tx: Tx, id: string, userId: string) => Promise<void>;
  /** Sólo propios: filtra por dueño, así nunca puede borrar uno del catálogo. */
  deleteCustom: (tx: Tx, exerciseId: string, ownerId: string) => Promise<void>;
}

export interface UsageCounter {
  count: (userId: string) => Promise<{ total: number; custom: number }>;
}
