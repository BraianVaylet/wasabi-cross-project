import type {
  Exercise,
  ManagedExercise,
  ManagedExerciseSummary,
  UpdateManagedExercise,
} from '@wasabi-cross/schemas';
import { AppError } from '../../../shared/errors/app-error.ts';
import type {
  ManagedExercisePatch,
  ManagedExerciseStore,
  RecordsGateway,
  TransactionRunner,
} from '../domain/managed-exercise-ports.ts';
import { sameName } from '../domain/names.ts';
import { toSummary } from './add-managed-exercise.ts';

export interface EditManagedExerciseDeps<Tx> {
  store: ManagedExerciseStore<Tx>;
  records: RecordsGateway<Tx>;
  transactions: TransactionRunner<Tx>;
}

/**
 * Busca el ejercicio gestionado del usuario y su definición. Uno ajeno responde lo mismo
 * que uno que no existe: 404, no 403 (spec §13).
 */
async function loadOwned<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  managedExerciseId: string,
): Promise<{ managed: ManagedExercise; exercise: Exercise }> {
  const managed = await store.findManagedById(userId, managedExerciseId);
  if (!managed) {
    throw new AppError('WC-EXO-404-002', { meta: { userId, managedExerciseId } });
  }

  const exercise = await store.findExercise(managed.exerciseId);
  if (!exercise) {
    // Un ejercicio gestionado sin su definición es una base corrupta, no un caso de negocio.
    throw new Error(`Ejercicio gestionado ${managed.id} sin su ejercicio ${managed.exerciseId}`);
  }

  return { managed, exercise };
}

/**
 * El nombre sólo cambia en un ejercicio propio, y con las mismas reglas que al crearlo: no
 * puede ser el de uno del catálogo ni el de otro propio. Ponerle su mismo nombre con otras
 * mayúsculas no choca consigo mismo.
 */
async function assertCanRename<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  exercise: Exercise,
  name: string,
): Promise<void> {
  if (exercise.ownerId === null) {
    throw new AppError('WC-SYS-400-002', {
      details: [
        { path: 'name', message: 'El nombre de un ejercicio del catálogo no se puede cambiar' },
      ],
      meta: { userId, exerciseId: exercise.id },
    });
  }

  if ((await store.findCatalog()).some((other) => sameName(other.name, name))) {
    throw new AppError('WC-EXO-409-004', { meta: { userId, name } });
  }

  const customs = await store.findCustomsOf(userId);
  if (customs.some((other) => other.id !== exercise.id && sameName(other.name, name))) {
    throw new AppError('WC-EXO-409-003', { meta: { userId, name } });
  }
}

/**
 * Cambia lo que es del usuario sobre un ejercicio —nivel, "con dolor", comentarios— y el
 * nombre si es propio (F1-06). La categoría no se cambia: la rechaza el schema.
 */
export async function editManagedExercise<Tx>(
  deps: EditManagedExerciseDeps<Tx>,
  request: { userId: string; managedExerciseId: string; input: UpdateManagedExercise },
): Promise<ManagedExerciseSummary> {
  const { userId, managedExerciseId, input } = request;
  const { managed, exercise } = await loadOwned(deps.store, userId, managedExerciseId);

  if (input.name !== undefined) {
    await assertCanRename(deps.store, userId, exercise, input.name);
  }

  const patch: ManagedExercisePatch = {
    ...(input.level === undefined ? {} : { level: input.level }),
    ...(input.withPain === undefined ? {} : { withPain: input.withPain }),
    // Un comentario vacío borra el que había.
    ...(input.notes === undefined ? {} : { notes: input.notes === '' ? null : input.notes }),
  };

  const updated = await deps.transactions.run(async (tx) => ({
    exercise:
      input.name === undefined
        ? exercise
        : await deps.store.renameCustom(tx, exercise.id, userId, input.name),
    managed:
      Object.keys(patch).length === 0
        ? managed
        : await deps.store.updateManaged(tx, managed.id, userId, patch),
  }));

  const current = (await deps.records.currentFor([managed.id])).get(managed.id);
  if (!current) {
    throw new Error(`Ejercicio gestionado ${managed.id} sin marcas`);
  }

  return toSummary(updated.exercise, updated.managed, current);
}

/**
 * Borra un ejercicio de la lista del usuario con todas sus marcas, y la definición si era
 * propio (F1-06). Todo o nada. Es irreversible: la confirmación con el nombre escrito vive
 * en el front (spec §11, F1-15).
 */
export async function deleteManagedExercise<Tx>(
  deps: EditManagedExerciseDeps<Tx>,
  request: { userId: string; managedExerciseId: string },
): Promise<void> {
  const { userId, managedExerciseId } = request;
  const { managed, exercise } = await loadOwned(deps.store, userId, managedExerciseId);

  await deps.transactions.run(async (tx) => {
    await deps.records.deleteAllFor(tx, managed.id);
    await deps.store.deleteManaged(tx, managed.id, userId);

    // Uno del catálogo queda: lo usan otros. Uno propio se va con su entrada.
    if (exercise.ownerId === userId) {
      await deps.store.deleteCustom(tx, exercise.id, userId);
    }
  });
}
