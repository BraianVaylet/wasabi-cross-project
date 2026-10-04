import { seedDevAdmin } from '../dev-support/seed-dev-admin.ts';
import { parseEnv } from '../src/config/env.ts';
import { createAuth } from '../src/modules/auth/infrastructure/better-auth.ts';
import { assertDevelopmentOnly } from '../src/shared/dev-only.ts';
import { connectMongo } from '../src/shared/db/mongo.ts';

/**
 * Siembra el usuario admin de desarrollo (plan Pro), ligado a la cuenta del IdP falso y sin
 * contraseña (ADR-0012). Se puede correr las veces que haga falta:
 * `pnpm --filter @wasabi-cross/api seed:admin`. Para entrar como él, `pnpm dev` con
 * `OAUTH_DEV_IDP=on` y un clic en la pantalla del IdP.
 *
 * Nunca en producción: el guard es la segunda red, por si alguna vez se corre a mano con
 * `NODE_ENV=production` puesto. Vive en `scripts/` y no en `src/` porque usa el IdP falso, que
 * `src/` no puede importar.
 */
async function main(): Promise<void> {
  const env = parseEnv();
  assertDevelopmentOnly(env, 'seed:admin');

  const mongo = await connectMongo(env);

  try {
    const auth = createAuth({ env, db: mongo.db, client: mongo.client });
    const { email, created } = await seedDevAdmin({
      auth,
      db: mongo.db,
      email: process.env.SEED_ADMIN_EMAIL,
      name: process.env.SEED_ADMIN_NAME,
    });

    console.info(`Usuario admin listo: ${email} (plan pro)${created ? ', recién creado' : ''}.`);
  } finally {
    await mongo.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
