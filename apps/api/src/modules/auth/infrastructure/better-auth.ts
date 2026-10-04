import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@wasabi-cross/schemas';
import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { testUtils } from 'better-auth/plugins';
import { haveIBeenPwned } from 'better-auth/plugins/haveibeenpwned';
import type { Db, MongoClient } from 'mongodb';
import type { Env } from '../../../config/env.ts';
import { generateId } from '../../../shared/ids.ts';

export interface CreateAuthOptions {
  env: Env;
  db: Db;
  client: MongoClient;
  /**
   * Mongo standalone (el de los tests) no soporta transacciones. En Atlas, que es
   * replica set, quedan activadas.
   */
  transactions?: boolean;
  /**
   * Plugins que se suman a los de siempre. Hoy sólo uno tiene sentido: el IdP falso de desarrollo
   * (F9-03), que lo arma `dev-support/` y lo inyecta `scripts/dev.ts`. Con `NODE_ENV=production`
   * `createAuth` se niega: ese IdP aceptaría a cualquiera (ADR-0012).
   */
  plugins?: readonly BetterAuthPlugin[];
  /** Los proveedores sociales (Google, Microsoft) que arma el módulo `oauth` (F9-05). */
  socialProviders?: BetterAuthOptions['socialProviders'];
}

export const AUTH_BASE_PATH = '/api/auth';

export function createAuth({
  env,
  db,
  client,
  transactions = true,
  plugins: extraPlugins = [],
  socialProviders,
}: CreateAuthOptions) {
  const isTest = env.NODE_ENV === 'test';

  if (env.NODE_ENV === 'production' && extraPlugins.length > 0) {
    throw new Error(
      'createAuth no admite plugins extra en producción (NODE_ENV=production): son del IdP de desarrollo, que aceptaría a cualquiera (ADR-0012).',
    );
  }

  return betterAuth({
    appName: 'Wasabi Cross',
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db, { client, transaction: transactions }),
    trustedOrigins: [env.WEB_ORIGIN],

    emailAndPassword: {
      enabled: true,
      // Los mismos largos que valida el formulario del front (@wasabi-cross/schemas):
      // una sola fuente, para que el registro no falle recién en la API.
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
    },

    user: {
      additionalFields: {
        /**
         * `input: false` es lo que impide que alguien se auto-otorgue el plan Pro
         * mandando `plan: "pro"` en el registro. El plan lo cambia `subscriptions`,
         * nunca el cliente.
         */
        plan: { type: 'string', defaultValue: 'free', input: false, required: false },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },

    advanced: {
      database: {
        // IDs con prefijo por entidad (ADR-0004).
        generateId: ({ model }) => generateId(model === 'user' ? 'usr' : model.slice(0, 3)),
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
      },
    },

    rateLimit: {
      // Apagado en los tests de la API y, si se pide, en el E2E (nunca en producción: lo
      // impide `parseEnv`).
      enabled: !isTest && env.AUTH_RATE_LIMIT === 'on',
      // En Mongo y no en memoria: sobrevive a un reinicio y sirve con más de
      // una instancia, que es justo cuando un límite en memoria deja de servir.
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        // spec §13: login 5/min/IP. Registro y recupero, lo mismo.
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/forget-password': { window: 60, max: 5 },
      },
    },

    // spec §13: verificación de la contraseña contra listas de filtradas.
    // Sólo manda los primeros cinco caracteres del hash SHA-1 (k-anonimato).
    // Apagado en test: un test no debería depender de una API externa.
    //
    // En test, en su lugar, `testUtils` (F9-04): helpers que crean usuarios y sesiones sin pasar
    // por ningún formulario ni proveedor (`ctx.test`). No registra rutas HTTP, pero crea sesiones
    // sin credenciales, así que **sólo** está con NODE_ENV=test: ni en desarrollo ni en producción.
    plugins: [
      ...(isTest
        ? // El tipo de `testUtils` (su `init` devuelve `ctx.test`) no encaja en `BetterAuthPlugin[]`,
          // y mezclarlo en este arreglo deja a `Auth` sin tipos. En runtime es un plugin más.
          [testUtils() as unknown as BetterAuthPlugin]
        : [
            haveIBeenPwned({
              customPasswordCompromisedMessage:
                'Esa contraseña apareció en filtraciones conocidas. Elegí otra.',
            }),
          ]),
      ...extraPlugins,
    ],

    ...(socialProviders ? { socialProviders } : {}),
  });
}

/** La instancia de Better Auth, con el tipo que se infiere de esta configuración. */
export type Auth = ReturnType<typeof createAuth>;
