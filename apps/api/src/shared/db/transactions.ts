import type { ClientSession, MongoClient } from 'mongodb';

/**
 * Corre `work` en una transacción de Mongo: todo o nada. El driver reintenta solo ante un
 * conflicto transitorio. Necesita replica set (ver `apps/api/.env.example`).
 *
 * Es para operaciones que tocan varios documentos y no consumen cupo del plan. Las que sí
 * lo consumen pasan por el serializador de `subscriptions`, que además serializa por
 * usuario (F1-03).
 */
export function createMongoTransactionRunner(client: MongoClient) {
  return {
    run: <T>(work: (session: ClientSession) => Promise<T>): Promise<T> =>
      client.withSession((session) => session.withTransaction(() => work(session))),
  };
}
