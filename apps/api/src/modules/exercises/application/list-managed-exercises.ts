import { limitsFor, type Exercise, type ExerciseList, type Plan } from '@wasabi-cross/schemas';
import type {
  ManagedExerciseStore,
  RecordsGateway,
  UsageCounter,
} from '../domain/managed-exercise-ports.ts';
import { nameMatches } from '../domain/names.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';
import { toSummary } from './add-managed-exercise.ts';

/**
 * La lista de Home (mockup 4): cada ejercicio con su valor actual, ordenada por nombre, y
 * cuánto del plan está usado.
 */
export async function listManagedExercises<Tx>(
  deps: { store: ManagedExerciseStore<Tx>; records: RecordsGateway<Tx>; counter: UsageCounter },
  user: { id: string; plan: Plan },
): Promise<ExerciseList> {
  const managed = await deps.store.listManaged(user.id);
  const exercises = new Map(
    (await deps.store.findExercisesByIds(managed.map((entry) => entry.exerciseId))).map(
      (exercise) => [exercise.id, exercise],
    ),
  );
  const currents = await deps.records.currentFor(managed.map((entry) => entry.id));

  const summaries = managed.map((entry) => {
    const exercise = exercises.get(entry.exerciseId);
    const current = currents.get(entry.id);

    // El alta crea las tres cosas en una transacción (F1-05), así que que falte alguna es
    // una base corrupta, no un caso de negocio: se corta acá y no se muestra algo a medias.
    if (!exercise || !current) {
      throw new Error(`Ejercicio gestionado ${entry.id} sin su ejercicio o sin marcas`);
    }

    return toSummary(exercise, entry, current);
  });

  const usage = await deps.counter.count(user.id);
  const limits = limitsFor(user.plan);

  return {
    exercises: summaries.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    usage: {
      plan: user.plan,
      total: usage.total,
      custom: usage.custom,
      maxTotal: limits.totalExercises,
      maxCustom: limits.customExercises,
    },
  };
}

/**
 * Búsqueda en el catálogo para "Nuevo ejercicio", sin distinguir mayúsculas ni acentos.
 *
 * Filtra en memoria: el catálogo son decenas de entradas. Si alguna vez son miles, lo que
 * corresponde es guardar el nombre normalizado con un índice y filtrar en la base.
 */
export async function searchCatalog(
  repository: ExerciseRepository,
  query: string | undefined,
): Promise<Exercise[]> {
  const catalog = await repository.findCatalog();

  return query === undefined || query.trim() === ''
    ? catalog
    : catalog.filter((exercise) => nameMatches(exercise.name, query));
}
