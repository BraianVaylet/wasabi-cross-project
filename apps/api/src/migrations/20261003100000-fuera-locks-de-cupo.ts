import type { Db } from 'mongodb';

/*
 * Se va el cupo de ejercicios del plan (ADR-0011, F8-01): el documento de lock por usuario que
 * serializaba las altas para no pasarse de 10 ya no lo escribe ni lo lee nadie.
 *
 * Los locks eran sólo coordinación —un contador que cada alta incrementaba para chocar con la
 * otra—, no un dato del usuario: al volver atrás no hay nada que recuperar y la colección
 * vuelve vacía. Se puede correr de nuevo: sin la colección, no hace nada.
 */

const LOCKS_COLLECTION = 'entitlement_locks';

async function exists(db: Db): Promise<boolean> {
  return db.listCollections({ name: LOCKS_COLLECTION }).hasNext();
}

export async function up(db: Db): Promise<void> {
  if (await exists(db)) {
    await db.collection(LOCKS_COLLECTION).drop();
  }
}

export async function down(db: Db): Promise<void> {
  if (!(await exists(db))) {
    await db.createCollection(LOCKS_COLLECTION);
  }
}
