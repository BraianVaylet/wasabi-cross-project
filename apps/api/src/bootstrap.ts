import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.ts';
import {
  composeExercises,
  composeOauth,
  composePhoto,
  composeRecords,
  composeStats,
  composeUsers,
} from './composition.ts';
import { parseEnv } from './config/env.ts';
import { createAuth, type CreateAuthOptions } from './modules/auth/infrastructure/better-auth.ts';
import { requireEnabledProviders } from './modules/oauth/application/require-providers.ts';
import { enabledProviders } from './modules/oauth/infrastructure/oauth-settings.ts';
import { socialProvidersFor } from './modules/oauth/infrastructure/social-providers.ts';
import { migrationsProbe } from './shared/db/migrations.ts';
import { connectMongo } from './shared/db/mongo.ts';

export interface StartServerOptions {
  /**
   * Plugins extra de Better Auth. Sólo hay uno que tenga sentido: el IdP falso de desarrollo
   * (F9-03), que `scripts/dev.ts` arma y se lo pasa. `createAuth` se niega a aceptarlos con
   * `NODE_ENV=production`; la entrada de producción (`server.ts`) no pasa ninguno.
   */
  authPlugins?: CreateAuthOptions['plugins'];
}

/**
 * Arma y levanta la API: conecta Mongo, crea Better Auth, compone los módulos y escucha. Es lo que
 * corren `server.ts` (producción), `scripts/dev.ts` (desarrollo) y `scripts/ephemeral.ts` (E2E).
 */
export async function startServer({
  authPlugins,
}: StartServerOptions = {}): Promise<FastifyInstance> {
  const env = parseEnv();

  // Con el ingreso sólo por OAuth (ADR-0012), una API sin ningún proveedor no deja entrar a nadie:
  // mejor que no arranque. Va acá y no en `parseEnv`: `migrate` y `seed` leen el mismo entorno y no
  // necesitan ningún proveedor.
  requireEnabledProviders(enabledProviders(env));

  const mongo = await connectMongo(env);

  const auth = createAuth({
    env,
    db: mongo.db,
    client: mongo.client,
    // Google y Microsoft, con las credenciales del entorno. El IdP falso de desarrollo entra por
    // `authPlugins`, nunca por acá.
    socialProviders: socialProvidersFor(env),
    ...(authPlugins ? { plugins: authPlugins } : {}),
  });

  const app = await buildApp({
    env,
    auth,
    oauth: composeOauth(env),
    users: composeUsers(mongo),
    photo: composePhoto(),
    exercises: composeExercises(mongo),
    records: composeRecords(mongo),
    stats: composeStats(mongo),
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

  return app;
}
