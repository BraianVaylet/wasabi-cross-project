import { seedAdmin } from '../modules/auth/application/seed-admin.ts';
import { createAuth } from '../modules/auth/infrastructure/better-auth.ts';
import { createUserRegistrar } from '../modules/auth/infrastructure/user-registrar.ts';
import { parseEnv } from '../config/env.ts';
import { connectMongo } from '../shared/db/mongo.ts';

/**
 * Siembra el usuario admin de desarrollo (plan Max). Se puede correr las veces que haga
 * falta: `pnpm --filter @wasabi-cross/api seed:admin`.
 *
 * Nunca en producción: ahí no hay `.env` y las credenciales de este usuario son conocidas
 * — el guard de abajo es la segunda red, por si alguna vez se corre a mano con
 * `NODE_ENV=production` puesto.
 */
async function main(): Promise<void> {
  const env = parseEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('seed-admin es sólo para desarrollo: no corre con NODE_ENV=production.');
  }

  const mongo = await connectMongo(env);

  try {
    const auth = createAuth({ env, db: mongo.db, client: mongo.client });
    const { email, created } = await seedAdmin(createUserRegistrar(auth), mongo.db, {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name: process.env.SEED_ADMIN_NAME,
    });

    console.info(`Usuario admin listo: ${email} (plan max)${created ? ', recién creado' : ''}.`);
  } finally {
    await mongo.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
