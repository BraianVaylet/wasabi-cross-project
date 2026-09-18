import type { ClientSession, Db, MongoClient } from 'mongodb';
import type { UserSerializer } from '../domain/ports.ts';

export const ENTITLEMENT_LOCKS_COLLECTION = 'entitlement_locks';

interface LockDocument {
  _id: string;
  version: number;
}

/**
 * Serializa por usuario con una transacción de Mongo más un documento de lock.
 *
 * Una transacción sola no alcanza: Mongo usa aislamiento por snapshot, así que dos
 * transacciones que cuentan 9 ejercicios e insertan documentos *distintos* no chocan y
 * confirman las dos (write skew). Por eso cada una escribe además el mismo documento de
 * lock del usuario: la segunda choca con la primera, el driver la reintenta y, ya con la
 * primera confirmada, cuenta 10.
 *
 * Usuarios distintos escriben locks distintos, así que no se esperan entre sí.
 *
 * Necesita un replica set (transacciones). Atlas lo es; en desarrollo, ver `.env.example`.
 */
export function createMongoUserSerializer(
  client: MongoClient,
  db: Db,
): UserSerializer<ClientSession> {
  const locks = db.collection<LockDocument>(ENTITLEMENT_LOCKS_COLLECTION);

  return {
    runExclusive: async (userId, work) => {
      // Fuera de la transacción: dos upserts simultáneos del mismo _id adentro de
      // transacciones pueden terminar en duplicate key, que no se reintenta. Afuera, el
      // servidor reintenta solo el upsert por igualdad sobre _id.
      await locks.updateOne({ _id: userId }, { $setOnInsert: { version: 0 } }, { upsert: true });

      return client.withSession((session) =>
        session.withTransaction(async () => {
          await locks.updateOne({ _id: userId }, { $inc: { version: 1 } }, { session });
          return work(session);
        }),
      );
    },
  };
}
