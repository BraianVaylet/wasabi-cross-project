import { parseEnv } from './config/env.ts';
import { buildApp } from './app.ts';
import { createAuth } from './modules/auth/infrastructure/better-auth.ts';
import {
  createMongoExerciseRepository,
  ensureExerciseIndexes,
} from './modules/exercises/infrastructure/mongo-exercise.repository.ts';
import { connectMongo } from './shared/db/mongo.ts';

async function main(): Promise<void> {
  const env = parseEnv();
  const mongo = await connectMongo(env);

  // Los índices se aseguran al arrancar: son parte de la forma de los datos, no algo
  // que dependa de que alguien se acuerde de correr un script.
  await ensureExerciseIndexes(mongo.db);

  const auth = createAuth({ env, db: mongo.db, client: mongo.client });

  const app = await buildApp({
    env,
    auth,
    exerciseRepository: createMongoExerciseRepository(mongo.db),
    probes: [{ name: 'mongo', check: mongo.ping }],
  });

  // Cerrar la conexión cuando se cae el server, no cuando el proceso ya se fue.
  app.addHook('onClose', async () => {
    await mongo.close();
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      app.log.info({ signal }, 'Apagando');
      void app.close().then(() => process.exit(0));
    });
  }

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
