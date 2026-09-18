import { parseEnv } from './config/env.ts';
import { buildApp } from './app.ts';
import { createAuth } from './modules/auth/infrastructure/better-auth.ts';
import { composeExercises, composeRecords } from './composition.ts';
import { migrationsProbe } from './shared/db/migrations.ts';
import { connectMongo } from './shared/db/mongo.ts';

async function main(): Promise<void> {
  const env = parseEnv();
  const mongo = await connectMongo(env);

  const auth = createAuth({ env, db: mongo.db, client: mongo.client });

  const app = await buildApp({
    env,
    auth,
    exercises: composeExercises(mongo),
    records: composeRecords(mongo),
    // La API no migra al arrancar: las migraciones corren una vez por deploy (ADR-0005).
    // Si alguien se las saltea, /ready lo dice y la instancia no recibe tráfico.
    probes: [{ name: 'mongo', check: mongo.ping }, migrationsProbe(mongo.db)],
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
