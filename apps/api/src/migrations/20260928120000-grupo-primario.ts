import type { Db } from 'mongodb';

/*
 * Grupo primario y disciplinas en todos los ejercicios (F5-01, spec §5.1, ADR-0009).
 *
 * Desde acá cada ejercicio tiene un grupo muscular primario, que encabeza su lista de
 * grupos, y el segmento del cuerpo sale sólo de él. Los que ya estaban no tienen de dónde
 * sacarlo: se toma el primero de su lista, que en el catálogo ya era el principal y en uno
 * propio es el primero que ofrecía el formulario. Las disciplinas arrancan vacías; el
 * seed completa las del catálogo, y en uno propio son opcionales.
 *
 * Los mapas de segmento están copiados acá y no importados de `@wasabi-cross/schemas`: una
 * migración describe un momento, y no puede cambiar de comportamiento porque cambie la
 * regla del código.
 */

const SEGMENT_BY_GROUP: Record<string, string> = {
  pectoral: 'tren_superior',
  espalda: 'tren_superior',
  espalda_baja: 'core',
  trapecio: 'tren_superior',
  hombro: 'tren_superior',
  biceps: 'tren_superior',
  triceps: 'tren_superior',
  antebrazo: 'tren_superior',
  core: 'core',
  gluteo: 'tren_inferior',
  cuadriceps: 'tren_inferior',
  isquiotibiales: 'tren_inferior',
  gemelo: 'tren_inferior',
  cuerpo_completo: 'cuerpo_completo',
};

interface ExerciseRow {
  _id: string;
  muscleGroups?: string[];
  primaryMuscleGroup?: string;
  bodySegment?: string;
  disciplines?: string[];
  equipment?: string;
  catalogKey?: string;
}

export async function up(db: Db): Promise<void> {
  const exercises = db.collection<ExerciseRow>('exercises');
  // Sólo los que no lo tienen: la migración se puede correr de nuevo.
  const pending = await exercises
    .find({ primaryMuscleGroup: { $exists: false } }, { projection: { muscleGroups: 1 } })
    .toArray();

  for (const exercise of pending) {
    const primary = exercise.muscleGroups?.[0];
    if (primary === undefined) {
      // Sin grupos no hay de dónde sacarlo. Sólo puede ser uno del catálogo que el seed
      // todavía no completó (F2-02 se los puso a todos los propios): lo completa el seed.
      continue;
    }

    await exercises.updateOne(
      { _id: exercise._id },
      {
        $set: {
          primaryMuscleGroup: primary,
          bodySegment: SEGMENT_BY_GROUP[primary] ?? 'cuerpo_completo',
        },
      },
    );
  }

  await exercises.updateMany({ disciplines: { $exists: false } }, { $set: { disciplines: [] } });
}

/** El segmento con la regla de antes: el de todos los grupos, o cuerpo completo si difieren. */
function segmentFromAllGroups(groups: readonly string[]): string {
  const [only, ...others] = new Set(
    groups.map((group) => SEGMENT_BY_GROUP[group] ?? 'cuerpo_completo'),
  );

  return only !== undefined && others.length === 0 ? only : 'cuerpo_completo';
}

export async function down(db: Db): Promise<void> {
  const exercises = db.collection<ExerciseRow>('exercises');
  const all = await exercises.find({}, { projection: { muscleGroups: 1 } }).toArray();

  for (const exercise of all) {
    const unset = {
      primaryMuscleGroup: '',
      disciplines: '',
      equipment: '',
      catalogKey: '',
    } as const;
    const groups = exercise.muscleGroups;

    await exercises.updateOne(
      { _id: exercise._id },
      groups === undefined
        ? { $unset: unset }
        : {
            // El segmento vuelve a la regla vieja. En el catálogo, el seed de esa versión
            // pisa igual lo que quede con los valores que tenía cargados a mano.
            $set: { bodySegment: segmentFromAllGroups(groups) },
            $unset: unset,
          },
    );
  }
}
