import type { Db } from 'mongodb';

/*
 * Índice del historial de marcas (F1-07): de un ejercicio gestionado, la más reciente
 * primero. Cubre el valor actual, el historial y su paginación por cursor.
 *
 * `createdAt` y `_id` desempatan dos marcas con la misma fecha de realización, que es lo
 * que hace que la paginación no repita ni saltee ninguna.
 */

export async function up(db: Db): Promise<void> {
  await db
    .collection('records')
    .createIndex(
      { managedExerciseId: 1, performedAt: -1, createdAt: -1, _id: -1 },
      { name: 'managed_history' },
    );
}

export async function down(db: Db): Promise<void> {
  await db.collection('records').dropIndex('managed_history');
}
