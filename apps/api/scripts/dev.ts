import type { BetterAuthPlugin } from 'better-auth';
import { startFakeIdp } from '../dev-support/fake-idp.ts';
import { fakeIdpAuthPlugin } from '../dev-support/fake-idp-auth.ts';
import { startServer } from '../src/bootstrap.ts';
import { parseEnv } from '../src/config/env.ts';
import { assertDevelopmentOnly } from '../src/shared/dev-only.ts';

/**
 * La API para desarrollar:
 *
 *   pnpm --filter @wasabi-cross/api dev
 *
 * Es lo mismo que `src/server.ts`, más el IdP falso (F9-03) cuando `OAUTH_DEV_IDP=on`: un
 * proveedor OpenID Connect local para entrar sin credenciales de Google ni de Microsoft. Escucha
 * en el puerto `FAKE_IDP_PORT` (3102 por defecto) y se registra como el proveedor `fake-idp`.
 *
 * Nunca en producción: `parseEnv` ya rechaza `OAUTH_DEV_IDP=on` con `NODE_ENV=production`, y el
 * guard de abajo es la segunda red por si alguien corre esto a mano.
 */
async function main(): Promise<void> {
  const env = parseEnv();
  assertDevelopmentOnly(env, 'scripts/dev.ts');

  const authPlugins: BetterAuthPlugin[] = [];

  if (env.OAUTH_DEV_IDP === 'on') {
    const idp = await startFakeIdp({
      port: Number(process.env.FAKE_IDP_PORT ?? '3102'),
      host: env.HOST,
      allowedRedirectOrigin: env.BETTER_AUTH_URL,
    });
    console.info(`IdP falso de desarrollo en ${idp.origin}`);
    authPlugins.push(fakeIdpAuthPlugin(idp));

    process.once('SIGINT', () => void idp.close());
    process.once('SIGTERM', () => void idp.close());
  }

  await startServer({ authPlugins });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
