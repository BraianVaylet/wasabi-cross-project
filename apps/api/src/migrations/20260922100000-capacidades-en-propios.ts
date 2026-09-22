import type { Db } from 'mongodb';

/*
 * Capacidades y grupos musculares en los ejercicios propios (F2-02, spec §5.1).
 *
 * Hasta acá sólo los tenía el catálogo, así que un ejercicio propio quedaba afuera de las
 * estadísticas generales. Los que ya estaban cargados no tienen con qué completarse: se
 * les pone la capacidad que se deduce de su categoría y el grupo más genérico que existe,
 * `cuerpo_completo`. Es lo más honesto que se puede afirmar sin inventar: el usuario puede
 * corregirlo, y los nuevos ya vienen con lo que él eligió.
 */

const CAPACITY_BY_CATEGORY = {
  fuerza: ['fuerza'],
  hipertrofia: ['fuerza'],
  gimnastico: ['fuerza'],
  running: ['resistencia'],
} as const;

export async function up(db: Db): Promise<void> {
  const exercises = db.collection('exercises');

  for (const [category, capacities] of Object.entries(CAPACITY_BY_CATEGORY)) {
    await exercises.updateMany(
      // Sólo propios y sólo los que no los tengan: la migración se puede correr de nuevo.
      { ownerId: { $ne: null }, category, capacities: { $exists: false } },
      {
        $set: {
          capacities: [...capacities],
          muscleGroups: ['cuerpo_completo'],
          bodySegment: 'cuerpo_completo',
        },
      },
    );
  }
}

export async function down(db: Db): Promise<void> {
  // Vuelve a dejar los propios como estaban: sin los tres campos. Los del catálogo no se
  // tocan, que los traen del seed.
  await db
    .collection('exercises')
    .updateMany(
      { ownerId: { $ne: null } },
      { $unset: { capacities: '', muscleGroups: '', bodySegment: '' } },
    );
}
