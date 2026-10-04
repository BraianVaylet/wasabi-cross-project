import { betterAuth, type BetterAuthOptions, type BetterAuthPlugin } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { testUtils } from 'better-auth/plugins';
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

/** Los campos de la cuenta que guardarían un token del proveedor, pisados con null. */
const NO_TOKENS = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
} as const;

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

    // Sin `emailAndPassword` (F9-05, ADR-0012): todo el ingreso y el registro pasan por un proveedor
    // OAuth. No hay contraseñas que guardar, hashear ni recuperar, y esos endpoints ni siquiera se
    // exponen (`auth-route-policy.ts`).

    account: {
      // Un email que ya tiene cuenta con otro proveedor no se vincula solo: recibe un aviso para
      // entrar con ese (spec §5.6). Vincular con email verificado en los dos lados queda como una
      // función aparte, con sesión iniciada.
      accountLinking: { enabled: false },
      // Los tokens del proveedor no se guardan, ni en el alta (hook de abajo) ni al volver a
      // entrar: sin esto Better Auth reescribe los de la cuenta en cada ingreso.
      updateAccountOnSignIn: false,
    },

    databaseHooks: {
      user: {
        create: {
          // Un email que el proveedor no verificó no crea usuario: con la vinculación apagada, el
          // email sólo importa para que nadie se adelante con el de otro, y eso lo impide pedirlo
          // verificado. Tampoco se fuerza a verificado (ADR-0012).
          before: (user) => Promise.resolve(user.emailVerified ? { data: {} } : false),
        },
      },
      account: {
        // Wasabi sólo necesita saber quién entra: el proveedor y su id. Los tokens se guardarían
        // en la base en claro, y no hay nada que hacer con ellos después del ingreso (la foto de
        // Microsoft se baja durante el ingreso). El `data` se mezcla sobre el original, así que se
        // pisan con null en vez de omitirlos.
        create: { before: () => Promise.resolve({ data: NO_TOKENS }) },
        update: { before: () => Promise.resolve({ data: NO_TOKENS }) },
      },
    },

    // Los errores del callback (cancelar, un state vencido, un email sin verificar) vuelven al
    // /login del front con `?error=`; si no, Better Auth mostraría su propia página de error.
    onAPIError: { errorURL: `${env.WEB_ORIGIN}/login` },

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
        // spec §13: el ingreso, 5/min/IP. Empezarlo y la vuelta del proveedor (la clave del límite
        // incluye el path, así que cada proveedor lleva su propia cuenta en el callback).
        '/sign-in/social': { window: 60, max: 5 },
        '/callback/*': { window: 60, max: 5 },
      },
    },

    // Sin `haveIBeenPwned` (no hay contraseñas, F9-05). En test, `testUtils` (F9-04): helpers que crean usuarios y sesiones sin pasar
    // por ningún formulario ni proveedor (`ctx.test`). No registra rutas HTTP, pero crea sesiones
    // sin credenciales, así que **sólo** está con NODE_ENV=test: ni en desarrollo ni en producción.
    plugins: [
      // El tipo de `testUtils` (su `init` devuelve `ctx.test`) no encaja en `BetterAuthPlugin[]`, y
      // mezclarlo en este arreglo deja a `Auth` sin tipos. En runtime es un plugin más.
      ...(isTest ? [testUtils() as unknown as BetterAuthPlugin] : []),
      ...extraPlugins,
    ],

    ...(socialProviders ? { socialProviders } : {}),
  });
}

/** La instancia de Better Auth, con el tipo que se infiere de esta configuración. */
export type Auth = ReturnType<typeof createAuth>;
