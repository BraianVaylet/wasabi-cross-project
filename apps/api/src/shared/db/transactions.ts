import type { ClientSession, MongoClient } from 'mongodb';

/**
 * Corre `work` en una transacción de Mongo: todo o nada. El driver reintenta solo ante un
 * conflicto transitorio. Necesita replica set (ver `apps/api/.env.example`).
 *
 * Es para las operaciones que tocan varios documentos: el alta de un ejercicio con su primera
 * marca, editar y borrar. Ante dos altas simultáneas del mismo ejercicio, el índice único de
 * `managed_exercises` hace que la segunda se deshaga entera.
 */
export function createMongoTransactionRunner(client: MongoClient) {
  return {
    run: <T>(work: (session: ClientSession) => Promise<T>): Promise<T> =>
      client.withSession((session) => session.withTransaction(() => work(session))),
  };
}
