import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.ts';
import type { Env } from '../config/env.ts';
import { createAuth } from '../modules/auth/infrastructure/better-auth.ts';
import { composeExercises, composeRecords } from '../composition.ts';
import { migrateUp, migrationsProbe } from '../shared/db/migrations.ts';
import { connectMongo, type MongoConnection } from '../shared/db/mongo.ts';
import { testEnv } from './env.ts';

export interface TestHarness {
  app: FastifyInstance;
  mongo: MongoConnection;
  env: Env;
  stop: () => Promise<void>;
}

/**
 * Levanta la API completa contra un Mongo en memoria. Los tests de integración usan
 * esto en vez de mocks: la parte que más falla de auth es la que toca la base.
 *
 * Es un replica set, como Atlas: el cupo de ejercicios (F1-03) y el alta atómica (F1-05)
 * usan transacciones, y en un Mongo standalone no existen. Así los tests corren con las
 * mismas garantías que producción, Better Auth incluido.
 */
export async function startTestApi(): Promise<TestHarness> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const env = testEnv({ MONGODB_URI: replSet.getUri() });
  const mongo = await connectMongo(env);

  const auth = createAuth({ env, db: mongo.db, client: mongo.client });

  // La base de test se prepara igual que la de producción: con las migraciones.
  await migrateUp(mongo.db, mongo.client);

  const app = await buildApp({
    env,
    auth,
    exercises: composeExercises(mongo),
    records: composeRecords(mongo),
    probes: [{ name: 'mongo', check: mongo.ping }, migrationsProbe(mongo.db)],
  });
  await app.ready();

  return {
    app,
    mongo,
    env,
    stop: async () => {
      await app.close();
      await mongo.close();
      await replSet.stop();
    },
  };
}

/** Extrae las cookies de sesión de una respuesta para reusarlas en el request siguiente. */
export function cookiesFrom(headers: Record<string, unknown>): string {
  const raw = headers['set-cookie'];
  const list: string[] = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string')
    : typeof raw === 'string'
      ? [raw]
      : [];

  return list.map((cookie) => cookie.split(';')[0]).join('; ');
}
