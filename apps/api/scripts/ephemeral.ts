import { randomBytes } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { seedAdmin } from '../src/modules/auth/application/seed-admin.ts';
import { createAuth } from '../src/modules/auth/infrastructure/better-auth.ts';
import { createUserRegistrar } from '../src/modules/auth/infrastructure/user-registrar.ts';
import { parseEnv } from '../src/config/env.ts';
import { seedCatalog } from '../src/modules/exercises/application/seed-catalog.ts';
import { createMongoExerciseRepository } from '../src/modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { migrateUp } from '../src/shared/db/migrations.ts';
import { connectMongo } from '../src/shared/db/mongo.ts';

/**
 * La API contra un Mongo que nace y muere con el proceso: migrado, sembrado y listo.
 *
 *   pnpm --filter @wasabi-cross/api dev:ephemeral
 *
 * Lo usa el E2E (F1-18) y sirve para probar a mano sin montar un replica set. No reemplaza
 * a `pnpm dev`: acá los datos se pierden al cerrar, y la sesión también, porque el secret
 * de Better Auth se sortea en cada arranque. Por eso el usuario admin (seed-admin) se
 * siembra de nuevo en cada arranque, y no sólo con `seed:admin`.
 */

const PORT = process.env.PORT ?? '3100';
const HOST = process.env.HOST ?? '127.0.0.1';

async function main(): Promise<void> {
  // Un solo nodo, pero replica set: el cupo del plan usa transacciones (F1-03).
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  process.env.NODE_ENV ??= 'development';
  process.env.LOG_LEVEL ??= 'warn';
  process.env.PORT = PORT;
  process.env.HOST = HOST;
  process.env.MONGODB_URI = replset.getUri();
  process.env.MONGODB_DB_NAME = 'wasabi_cross_ephemeral';
  process.env.WEB_ORIGIN ??= 'http://127.0.0.1:5174';
  process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('base64');
  process.env.BETTER_AUTH_URL ??= `http://${HOST}:${PORT}`;

  const env = parseEnv();
  const mongo = await connectMongo(env);
  try {
    await migrateUp(mongo.db, mongo.client);
    await seedCatalog(createMongoExerciseRepository(mongo.db));

    const auth = createAuth({ env, db: mongo.db, client: mongo.client });
    const { email } = await seedAdmin(createUserRegistrar(auth), mongo.db, {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name: process.env.SEED_ADMIN_NAME,
    });
    console.info(`Usuario admin (plan Max): ${email}`);
  } finally {
    await mongo.close();
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    // Antes que el handler del server, que termina el proceso: sin esto, el mongod hijo
    // puede quedar vivo después de que el padre se fue.
    process.once(signal, () => {
      void replset.stop();
    });
  }

  await import('../src/server.ts');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
