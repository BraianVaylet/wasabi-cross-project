import { MongoClient, type Db } from 'mongodb';
import type { Env } from '../../config/env.ts';

export interface MongoConnection {
  readonly client: MongoClient;
  readonly db: Db;
  /** Ping real a la base. `false` en vez de throw: lo consume el readiness check. */
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
}

export async function connectMongo(env: Env): Promise<MongoConnection> {
  const client = new MongoClient(env.MONGODB_URI, {
    // Si Mongo no responde rápido, preferimos fallar el readiness antes que
    // acumular requests colgadas esperando conexión.
    serverSelectionTimeoutMS: 5_000,
  });

  await client.connect();
  const db = client.db(env.MONGODB_DB_NAME);

  return {
    client,
    db,
    ping: async () => {
      try {
        await db.command({ ping: 1 });
        return true;
      } catch {
        return false;
      }
    },
    close: async () => {
      await client.close();
    },
  };
}
