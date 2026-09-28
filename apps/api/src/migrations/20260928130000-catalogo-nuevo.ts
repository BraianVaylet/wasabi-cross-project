import { randomBytes } from 'node:crypto';
import type { Db } from 'mongodb';

/*
 * Fuera el catálogo viejo (F5-06, ADR-0009).
 *
 * El catálogo de la Fase 0 (33 ejercicios) se reemplaza por los 62 de spec §5.3. Un ejercicio
 * del catálogo que no sobrevive al reemplazo se borra junto con los ejercicios gestionados y
 * las marcas que apuntan a él: no hay producción, así que sólo se pierden datos de desarrollo
 * y staging. Después de producción, un cambio así se hace migrando cada marca.
 *
 * No sobrevive el ejercicio del catálogo (sin dueño) que:
 *
 * - no tiene clave, o su clave ya no está en el catálogo nuevo; o
 * - tiene una clave que sigue, pero con otra categoría: cambiar la categoría de un ejercicio con
 *   marcas las deja en otra unidad (Thruster pasa de kg a repeticiones y peso).
 *
 * Los que sobreviven (misma clave y categoría) conservan su ID y lo que apunta a ellos: el seed
 * sólo les actualiza el nombre y los datos. Los propios no se tocan.
 *
 * Corre antes que el seed. Sin esta migración el seed choca contra el índice único del nombre
 * cuando un ejercicio nuevo se llama como uno viejo sin clave.
 *
 * Una migración no importa nada del código de la app: es una foto de este momento. Por eso las
 * dos listas de abajo están copiadas y no importadas del catálogo.
 */

/** La categoría de cada ejercicio del catálogo nuevo, por su clave. */
const CATEGORY_BY_KEY: Record<string, string> = {
  'back-squat': 'fuerza',
  'front-squat': 'fuerza',
  'peso-muerto-convencional': 'fuerza',
  'peso-muerto-rumano': 'hipertrofia',
  'press-banca-plano': 'hipertrofia',
  'press-banca-inclinado': 'hipertrofia',
  'press-militar': 'fuerza',
  'remo-con-barra': 'hipertrofia',
  'dominadas-lastradas': 'fuerza',
  'curl-biceps-barra': 'hipertrofia',
  'curl-martillo': 'hipertrofia',
  'extension-triceps-polea': 'hipertrofia',
  'press-frances': 'hipertrofia',
  'prensa-piernas': 'hipertrofia',
  'curl-femoral': 'hipertrofia',
  'elevacion-gemelos': 'hipertrofia',
  'hip-thrust': 'hipertrofia',
  'elevaciones-laterales': 'hipertrofia',
  'crunch-abdominal': 'gimnastico',
  snatch: 'fuerza',
  'clean-and-jerk': 'fuerza',
  'push-press': 'fuerza',
  'overhead-squat': 'fuerza',
  thruster: 'hipertrofia',
  'wall-ball': 'gimnastico',
  'kettlebell-swing': 'gimnastico',
  'pull-up': 'gimnastico',
  'toes-to-bar': 'gimnastico',
  'muscle-up': 'gimnastico',
  'handstand-push-up': 'gimnastico',
  'box-jump': 'gimnastico',
  burpee: 'gimnastico',
  'double-under': 'gimnastico',
  'rope-climb': 'gimnastico',
  'remo-ergometro': 'cardio',
  'assault-bike': 'cardio',
  'ski-erg': 'cardio',
  'sled-push-hyrox': 'distancia_carga',
  'sled-pull-hyrox': 'distancia_carga',
  'farmers-carry-hyrox': 'distancia_carga',
  'sandbag-lunges': 'hipertrofia',
  'burpee-broad-jump': 'gimnastico',
  'carrera-1km-estacion': 'running',
  'sled-push': 'hipertrofia',
  'sled-pull': 'hipertrofia',
  'farmers-carry': 'hipertrofia',
  'battle-ropes': 'gimnastico',
  'trx-row': 'gimnastico',
  'trx-push-up': 'gimnastico',
  'mountain-climbers': 'gimnastico',
  'jumping-jacks': 'gimnastico',
  'bear-crawl': 'gimnastico',
  'medicine-ball-slam': 'gimnastico',
  'box-step-up': 'gimnastico',
  'kettlebell-goblet-squat': 'hipertrofia',
  'lateral-band-walk': 'gimnastico',
  'jump-squat': 'gimnastico',
  'carrera-100m': 'running',
  'carrera-400m': 'running',
  'carrera-1km': 'running',
  'carrera-5km': 'running',
  'carrera-10km': 'running',
};

interface OldCatalogRow {
  catalogKey: string;
  name: string;
  category: string;
  capacities: string[];
  primaryMuscleGroup: string;
  muscleGroups: string[];
  bodySegment: string;
  disciplines: string[];
  equipment: string;
}

/** El catálogo de la Fase 0 con lo que tenía en F5-01: es lo que el `down` vuelve a poner. */
const OLD_CATALOG: readonly OldCatalogRow[] = [
  {
    catalogKey: 'back-squat',
    name: 'Back squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'gluteo', 'core'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio', 'crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'front-squat',
    name: 'Front squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'core'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio', 'crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'overhead-squat',
    name: 'Overhead squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'hombro', 'core'],
    bodySegment: 'tren_inferior',
    disciplines: ['crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'peso-muerto',
    name: 'Peso muerto',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'isquiotibiales',
    muscleGroups: ['isquiotibiales', 'gluteo', 'espalda'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio', 'crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'peso-muerto-rumano',
    name: 'Peso muerto rumano',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'isquiotibiales',
    muscleGroups: ['isquiotibiales', 'gluteo'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'hip-thruster',
    name: 'Hip thruster',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'gluteo',
    muscleGroups: ['gluteo', 'isquiotibiales'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'estocada-con-mancuernas',
    name: 'Estocada con mancuernas',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'gluteo'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio'],
    equipment: 'mancuerna',
  },
  {
    catalogKey: 'elevacion-de-gemelos',
    name: 'Elevación de gemelos',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'gemelo',
    muscleGroups: ['gemelo'],
    bodySegment: 'tren_inferior',
    disciplines: ['gimnasio'],
    equipment: 'maquina',
  },
  {
    catalogKey: 'press-de-banca',
    name: 'Press de banca',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'pectoral',
    muscleGroups: ['pectoral', 'triceps', 'hombro'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'floor-press',
    name: 'Floor press',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'pectoral',
    muscleGroups: ['pectoral', 'triceps'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'press-militar',
    name: 'Press militar',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'hombro',
    muscleGroups: ['hombro', 'triceps', 'core'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'push-press',
    name: 'Push press',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    primaryMuscleGroup: 'hombro',
    muscleGroups: ['hombro', 'cuadriceps', 'triceps'],
    bodySegment: 'tren_superior',
    disciplines: ['crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'remo-con-barra',
    name: 'Remo con barra',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'espalda',
    muscleGroups: ['espalda', 'biceps'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'butterfly',
    name: 'Butterfly',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'pectoral',
    muscleGroups: ['pectoral'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'maquina',
  },
  {
    catalogKey: 'curl-de-biceps',
    name: 'Curl de biceps',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'biceps',
    muscleGroups: ['biceps', 'antebrazo'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'barra',
  },
  {
    catalogKey: 'extension-de-triceps',
    name: 'Extensión de triceps',
    category: 'hipertrofia',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'triceps',
    muscleGroups: ['triceps'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'polea',
  },
  {
    catalogKey: 'snatch',
    name: 'Snatch',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    primaryMuscleGroup: 'cuerpo_completo',
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
    disciplines: ['crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'clean-and-jerk',
    name: 'Clean and jerk',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    primaryMuscleGroup: 'cuerpo_completo',
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
    disciplines: ['crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'power-clean',
    name: 'Power clean',
    category: 'fuerza',
    capacities: ['fuerza', 'velocidad'],
    primaryMuscleGroup: 'cuerpo_completo',
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
    disciplines: ['crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'thruster',
    name: 'Thruster',
    category: 'fuerza',
    capacities: ['fuerza', 'resistencia'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'hombro'],
    bodySegment: 'tren_inferior',
    disciplines: ['crossfit'],
    equipment: 'barra',
  },
  {
    catalogKey: 'dominadas-estrictas',
    name: 'Dominadas estrictas',
    category: 'gimnastico',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'espalda',
    muscleGroups: ['espalda', 'biceps'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio', 'crossfit'],
    equipment: 'barra_dominadas',
  },
  {
    catalogKey: 'pull-ups',
    name: 'Pull-ups',
    category: 'gimnastico',
    capacities: ['fuerza', 'resistencia'],
    primaryMuscleGroup: 'espalda',
    muscleGroups: ['espalda', 'biceps'],
    bodySegment: 'tren_superior',
    disciplines: ['crossfit'],
    equipment: 'barra_dominadas',
  },
  {
    catalogKey: 'fondos-en-paralelas',
    name: 'Fondos en paralelas',
    category: 'gimnastico',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'triceps',
    muscleGroups: ['triceps', 'pectoral'],
    bodySegment: 'tren_superior',
    disciplines: ['gimnasio'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'flexiones-de-brazos',
    name: 'Flexiones de brazos',
    category: 'gimnastico',
    capacities: ['fuerza', 'resistencia'],
    primaryMuscleGroup: 'pectoral',
    muscleGroups: ['pectoral', 'triceps'],
    bodySegment: 'tren_superior',
    disciplines: ['funcional'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'handstand-push-ups',
    name: 'Handstand push-ups',
    category: 'gimnastico',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'hombro',
    muscleGroups: ['hombro', 'triceps'],
    bodySegment: 'tren_superior',
    disciplines: ['crossfit'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'toes-to-bar',
    name: 'Toes to bar',
    category: 'gimnastico',
    capacities: ['fuerza', 'resistencia'],
    primaryMuscleGroup: 'core',
    muscleGroups: ['core'],
    bodySegment: 'core',
    disciplines: ['crossfit'],
    equipment: 'barra_dominadas',
  },
  {
    catalogKey: 'burpees',
    name: 'Burpees',
    category: 'gimnastico',
    capacities: ['resistencia'],
    primaryMuscleGroup: 'cuerpo_completo',
    muscleGroups: ['cuerpo_completo'],
    bodySegment: 'cuerpo_completo',
    disciplines: ['crossfit'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'double-unders',
    name: 'Double unders',
    category: 'gimnastico',
    capacities: ['resistencia', 'velocidad'],
    primaryMuscleGroup: 'gemelo',
    muscleGroups: ['gemelo'],
    bodySegment: 'tren_inferior',
    disciplines: ['crossfit'],
    equipment: 'cuerda_de_saltar',
  },
  {
    catalogKey: 'sprint-100-m',
    name: 'Sprint 100 m',
    category: 'running',
    capacities: ['velocidad'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'isquiotibiales', 'gemelo'],
    bodySegment: 'tren_inferior',
    disciplines: ['running'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'carrera-400-m',
    name: 'Carrera 400 m',
    category: 'running',
    capacities: ['velocidad', 'resistencia'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'isquiotibiales'],
    bodySegment: 'tren_inferior',
    disciplines: ['running'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'carrera-1-km',
    name: 'Carrera 1 km',
    category: 'running',
    capacities: ['resistencia'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'isquiotibiales', 'gemelo'],
    bodySegment: 'tren_inferior',
    disciplines: ['running'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'carrera-5-km',
    name: 'Carrera 5 km',
    category: 'running',
    capacities: ['resistencia'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'isquiotibiales', 'gemelo'],
    bodySegment: 'tren_inferior',
    disciplines: ['running'],
    equipment: 'sin_equipo',
  },
  {
    catalogKey: 'row-500-m',
    name: 'Row 500 m',
    category: 'running',
    capacities: ['resistencia', 'velocidad'],
    primaryMuscleGroup: 'espalda',
    muscleGroups: ['espalda', 'cuadriceps'],
    bodySegment: 'tren_superior',
    disciplines: ['crossfit'],
    equipment: 'remoergometro',
  },
];

const KEY_INDEX = 'catalog_key_unique';

interface CatalogRow {
  _id: string;
  catalogKey?: string;
  category?: string;
}

/** ¿Este ejercicio del catálogo se va con el reemplazo? */
function doesNotSurvive(row: CatalogRow): boolean {
  if (row.catalogKey === undefined) {
    return true;
  }
  const category = CATEGORY_BY_KEY[row.catalogKey];

  return category === undefined || category !== row.category;
}

export async function up(db: Db): Promise<void> {
  const exercises = db.collection<CatalogRow>('exercises');
  const catalog = await exercises
    .find({ ownerId: null }, { projection: { catalogKey: 1, category: 1 } })
    .toArray();
  const gone = catalog.filter(doesNotSurvive).map((row) => row._id);

  if (gone.length > 0) {
    const managed = db.collection<{ _id: string; exerciseId: string }>('managed_exercises');
    const managedIds = (await managed.find({ exerciseId: { $in: gone } }).toArray()).map(
      (row) => row._id,
    );

    // De adentro hacia afuera: nunca queda una marca sin su ejercicio gestionado.
    await db.collection('records').deleteMany({ managedExerciseId: { $in: managedIds } });
    await managed.deleteMany({ _id: { $in: managedIds } });
    await exercises.deleteMany({ _id: { $in: gone } });
  }

  // Una clave por ejercicio del catálogo. Los propios no tienen clave y quedan afuera.
  await exercises.createIndex(
    { catalogKey: 1 },
    { unique: true, name: KEY_INDEX, partialFilterExpression: { catalogKey: { $type: 'string' } } },
  );
}

function newId(): string {
  // Mismo formato que los IDs de dominio (ADR-0004): `exo_` y 16 caracteres.
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const suffix = [...randomBytes(16)].map((byte) => alphabet.charAt(byte % alphabet.length));

  return `exo_${suffix.join('')}`;
}

/**
 * Deja el índice como estaba y vuelve a poner el catálogo viejo. NO devuelve los ejercicios
 * gestionados ni las marcas que `up` borró: es la única parte no reversible, y es aceptable
 * sólo porque no hay usuarios reales (ADR-0009). Los ejercicios que sobrevivieron al `up`
 * quedan con la definición nueva hasta que corra el seed de esa versión.
 */
export async function down(db: Db): Promise<void> {
  const exercises = db.collection<{ _id: string; catalogKey?: string; name: string }>('exercises');
  await exercises.dropIndex(KEY_INDEX);

  const now = new Date().toISOString();
  for (const old of OLD_CATALOG) {
    const exists = await exercises.findOne({
      ownerId: null,
      $or: [{ catalogKey: old.catalogKey }, { name: old.name }],
    } as never);
    if (exists) {
      continue;
    }

    await exercises.insertOne({
      _id: newId(),
      ownerId: null,
      ...old,
      createdAt: now,
      updatedAt: now,
    } as never);
  }
}
