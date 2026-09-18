import {
  measureKindFor,
  recordValueSchemaFor,
  type AddExercise,
  type Exercise,
  type ExerciseCategory,
  type ManagedExercise,
  type ManagedExerciseSummary,
  type Plan,
} from '@wasabi-cross/schemas';
import { AppError } from '../../../shared/errors/app-error.ts';
import type {
  CurrentValue,
  ExerciseSlots,
  ManagedExerciseStore,
  RecordsGateway,
} from '../domain/managed-exercise-ports.ts';
import { sameName } from '../domain/names.ts';

export interface AddManagedExerciseDeps<Tx> {
  store: ManagedExerciseStore<Tx>;
  slots: ExerciseSlots<Tx>;
  records: RecordsGateway<Tx>;
}

export function toSummary(
  exercise: Exercise,
  managed: ManagedExercise,
  current: CurrentValue,
): ManagedExerciseSummary {
  return {
    id: managed.id,
    exerciseId: exercise.id,
    name: exercise.name,
    category: exercise.category,
    kind: measureKindFor(exercise.category),
    isCustom: exercise.ownerId !== null,
    level: managed.level,
    withPain: managed.withPain,
    ...(managed.notes === undefined ? {} : { notes: managed.notes }),
    current: { value: current.value, unit: current.unit, performedAt: current.performedAt },
  };
}

/**
 * Del catálogo: tiene que existir y ser del catálogo, o ser propio de este usuario. El
 * propio de otro usuario responde lo mismo que uno que no existe — 404, no 403 — porque
 * confirmar que existe ya es filtrar información (spec §13).
 */
async function resolveCatalogPick<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  exerciseId: string,
): Promise<Exercise> {
  const exercise = await store.findExercise(exerciseId);

  if (!exercise || (exercise.ownerId !== null && exercise.ownerId !== userId)) {
    throw new AppError('WC-EXO-404-002', { meta: { userId, exerciseId } });
  }

  if (await store.findManaged(userId, exercise.id)) {
    throw new AppError('WC-EXO-409-003', { meta: { userId, exerciseId } });
  }

  return exercise;
}

/**
 * Propio: se crea sólo si no existe (spec §5). Si su nombre es el de uno del catálogo, el
 * usuario tiene que elegir ese; si es el de otro propio suyo, ya lo tiene en la lista.
 */
async function assertCustomNameIsFree<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  name: string,
): Promise<void> {
  if ((await store.findCatalog()).some((exercise) => sameName(exercise.name, name))) {
    throw new AppError('WC-EXO-409-004', { meta: { userId, name } });
  }

  if ((await store.findCustomsOf(userId)).some((exercise) => sameName(exercise.name, name))) {
    throw new AppError('WC-EXO-409-003', { meta: { userId, name } });
  }
}

/**
 * Agrega un ejercicio a la lista del usuario —uno del catálogo o uno propio— junto con su
 * primera marca, todo o nada (F1-05).
 *
 * Los chequeos de existencia y de duplicado van antes del cupo, para que quien está en el
 * límite y repite un ejercicio lea "ya lo tenés" y no "llegaste al máximo". Los índices
 * únicos siguen siendo la garantía ante una carrera; estos chequeos son para el mensaje.
 */
export async function addManagedExercise<Tx>(
  deps: AddManagedExerciseDeps<Tx>,
  request: { userId: string; plan: Plan; input: AddExercise },
): Promise<ManagedExerciseSummary> {
  const { userId, plan, input } = request;
  const { store, slots, records } = deps;

  // Qué se agrega: un ejercicio que ya existe, o uno propio nuevo que se crea en la
  // transacción. Los dos caminos quedan explícitos en el tipo.
  let target: { existing: Exercise } | { newName: string };
  let category: ExerciseCategory;

  if (input.source === 'catalog') {
    const existing = await resolveCatalogPick(store, userId, input.exerciseId);
    target = { existing };
    category = existing.category;
  } else {
    await assertCustomNameIsFree(store, userId, input.name);
    target = { newName: input.name };
    category = input.category;
  }

  const kind = measureKindFor(category);

  // El valor se valida acá, con la regla de su medición, antes de abrir la transacción.
  const value = recordValueSchemaFor(kind).safeParse(input.firstRecord.value);
  if (!value.success) {
    throw new AppError('WC-RM-422-001', {
      details: value.error.issues.map((issue) => ({
        path: 'firstRecord.value',
        message: issue.message,
      })),
      meta: { userId, kind, value: input.firstRecord.value },
    });
  }

  const performedAt = input.firstRecord.performedAt ?? new Date().toISOString();

  return slots.withSlot({ userId, plan, isCustom: input.source === 'custom' }, async (tx) => {
    const exercise =
      'existing' in target
        ? target.existing
        : await store.createCustom(tx, { ownerId: userId, name: target.newName, category });

    const managed = await store.createManaged(tx, {
      userId,
      exerciseId: exercise.id,
      level: input.level,
      withPain: input.withPain,
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    });

    const current = await records.logFirst(tx, {
      userId,
      managedExerciseId: managed.id,
      kind,
      value: value.data,
      performedAt,
      ...(input.firstRecord.notes === undefined ? {} : { notes: input.firstRecord.notes }),
    });

    return toSummary(exercise, managed, current);
  });
}
