import type { ClientSession, Db } from 'mongodb';
import { EXERCISES_COLLECTION, MANAGED_EXERCISES_COLLECTION } from './mongo-exercise.repository.ts';

/**
 * Cuántos ejercicios tiene un usuario en su lista y cuántos son propios, para el cupo del
 * plan (spec §4). Lo consume `subscriptions` a través de su puerto `ExerciseUsageCounter`;
 * no importa nada de ese módulo: la compatibilidad la chequea TypeScript donde se cablean.
 *
 * Los propios se cuentan por dueño en `exercises`. Coincide con los propios de la lista
 * porque un ejercicio propio se crea y se borra junto con su entrada gestionada (F1-05,
 * F1-06).
 */
export function createMongoExerciseUsageCounter(db: Db) {
  return {
    count: async (userId: string, session: ClientSession) => {
      // En secuencia y no con Promise.all: una transacción no admite operaciones en
      // paralelo sobre la misma sesión.
      const total = await db
        .collection(MANAGED_EXERCISES_COLLECTION)
        .countDocuments({ userId }, { session });
      const custom = await db
        .collection(EXERCISES_COLLECTION)
        .countDocuments({ ownerId: userId }, { session });

      return { total, custom };
    },
  };
}
