import { MongoMemoryServer } from 'mongodb-memory-server';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.ts';
import type { Env } from '../config/env.ts';
import { createAuth } from '../modules/auth/infrastructure/better-auth.ts';
import { createMongoExerciseRepository } from '../modules/exercises/infrastructure/mongo-exercise.repository.ts';
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
 */
export async function startTestApi(): Promise<TestHarness> {
  const mongod = await MongoMemoryServer.create();
  const env = testEnv({ MONGODB_URI: mongod.getUri() });
  const mongo = await connectMongo(env);

  const auth = createAuth({
    env,
    db: mongo.db,
    client: mongo.client,
    // mongodb-memory-server es standalone: sin replica set no hay transacciones.
    transactions: false,
  });

  // La base de test se prepara igual que la de producción: con las migraciones.
  await migrateUp(mongo.db, mongo.client);

  const app = await buildApp({
    env,
    auth,
    exerciseRepository: createMongoExerciseRepository(mongo.db),
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
      await mongod.stop();
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
