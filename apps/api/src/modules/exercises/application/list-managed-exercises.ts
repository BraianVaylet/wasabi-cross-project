import type { CatalogEntry, CatalogQuery, ExerciseList } from '@wasabi-cross/schemas';
import type { ManagedExerciseStore, RecordsGateway } from '../domain/managed-exercise-ports.ts';
import { nameMatches } from '../domain/names.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';
import { toSummary } from './add-managed-exercise.ts';

/**
 * La lista de Home (mockup 4): cada ejercicio con su valor actual, ordenada por nombre. No hay
 * tope: los dos planes cargan todo lo que quieran (spec §4).
 */
export async function listManagedExercises<Tx>(
  deps: { store: ManagedExerciseStore<Tx>; records: RecordsGateway<Tx> },
  user: { id: string },
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

  return { exercises: summaries.sort((a, b) => a.name.localeCompare(b.name, 'es')) };
}

/**
 * Búsqueda en el catálogo para "Nuevo ejercicio": por parte del nombre (sin distinguir
 * mayúsculas ni acentos) y por disciplina, y cada resultado dice si el usuario ya lo tiene.
 *
 * Filtra en memoria: el catálogo son decenas de entradas. Si alguna vez son miles, lo que
 * corresponde es guardar el nombre normalizado con un índice y filtrar en la base.
 */
export async function searchCatalog<Tx>(
  deps: { repository: ExerciseRepository; store: ManagedExerciseStore<Tx> },
  userId: string,
  { q, discipline }: CatalogQuery,
): Promise<CatalogEntry[]> {
  const [catalog, managed] = await Promise.all([
    deps.repository.findCatalog(),
    deps.store.listManaged(userId),
  ]);
  const added = new Set(managed.map((entry) => entry.exerciseId));

  return catalog
    .filter((exercise) => q === undefined || q === '' || nameMatches(exercise.name, q))
    .filter((exercise) => discipline === undefined || exercise.disciplines.includes(discipline))
    .map((exercise) => ({ ...exercise, alreadyAdded: added.has(exercise.id) }));
}
