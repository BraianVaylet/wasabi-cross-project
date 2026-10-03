import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { planSchema } from '@wasabi-cross/schemas';
import type { Db } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { z } from 'zod';
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
const CONTROL_PORT = Number(process.env.EPHEMERAL_CONTROL_PORT ?? '3101');

const planChange = z.object({ email: z.email(), plan: planSchema });

/**
 * Un control sólo para el E2E: fija el plan de un usuario (spec §4). No hay endpoint del producto que
 * lo haga —sin pasarela de pago, uno así regalaría Pro (ADR-0011)— y los E2E necesitan atletas
 * nuevos de un plan y del otro. Vive acá, en el script de la base descartable, y escucha sólo en
 * 127.0.0.1: nunca forma parte de la API que se despliega.
 *
 *   POST /plan   { "email": "…", "plan": "pro" }   →  204, o 404 si no hay ese usuario
 */
function startPlanControl(db: Db): Server {
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/plan') {
      response.writeHead(404).end();
      return;
    }

    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      void (async () => {
        let body: unknown;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          body = undefined;
        }

        const change = planChange.safeParse(body);
        if (!change.success) {
          response.writeHead(400).end();
          return;
        }

        const { matchedCount } = await db
          .collection('user')
          .updateOne({ email: change.data.email }, { $set: { plan: change.data.plan } });
        response.writeHead(matchedCount === 0 ? 404 : 204).end();
      })();
    });
  });

  server.listen(CONTROL_PORT, HOST);
  return server;
}

async function main(): Promise<void> {
  // Como `seed:admin`: un control que cambia planes no corre contra datos de verdad.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('dev:ephemeral no corre con NODE_ENV=production.');
  }

  // Un solo nodo, pero replica set: el alta de un ejercicio usa transacciones (F1-05).
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
    console.info(`Usuario admin (plan Pro): ${email}`);
  } finally {
    await mongo.close();
  }

  // Su propia conexión: la de arriba se cerró al terminar el seed.
  const control = await connectMongo(env);
  const planControl = startPlanControl(control.db);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    // Antes que el handler del server, que termina el proceso: sin esto, el mongod hijo
    // puede quedar vivo después de que el padre se fue.
    process.once(signal, () => {
      planControl.close();
      void control.close();
      void replset.stop();
    });
  }

  await import('../src/server.ts');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
