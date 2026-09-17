import { parseEnv } from './config/env.ts';
import { buildApp } from './app.ts';
import { connectMongo } from './shared/db/mongo.ts';

async function main(): Promise<void> {
  const env = parseEnv();
  const mongo = await connectMongo(env);

  const app = await buildApp({
    env,
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
