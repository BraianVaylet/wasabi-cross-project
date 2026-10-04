import { z } from 'zod';

/**
 * Configuración del proceso, validada al arrancar. Si falta o está mal una variable,
 * el proceso no levanta: es preferible un arranque roto a una API a medio configurar.
 */
const httpUrl = z.url({ protocol: /^https?$/ });

/**
 * Una variable opcional donde vacía vale como ausente: un `.env` copiado de `.env.example` con
 * `GOOGLE_CLIENT_ID=` no tiene que romper el arranque ni contar como un proveedor a medias.
 */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  HOST: z.string().min(1).default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1),

  // `z.url()` a secas acepta "localhost:5173", porque lo lee como esquema
  // "localhost:". Eso terminaría en la config de CORS, así que se exige http/https.
  WEB_ORIGIN: httpUrl,

  /*
   * Dónde está el front compilado (`apps/web/dist`). Con esto la API lo sirve, en el mismo
   * origen (F3-03, ADR-0007). Sin esto —desarrollo— el front lo sirve Vite.
   */
  WEB_DIST_DIR: z.string().min(1).optional(),

  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET necesita al menos 32 caracteres'),
  BETTER_AUTH_URL: httpUrl,

  /*
   * El límite de intentos de login y registro (spec §13: 5 por minuto por IP). Sólo se apaga
   * para el E2E, que registra un atleta por test desde la misma IP. En producción, no: el
   * refine de abajo no deja levantar el proceso.
   */
  AUTH_RATE_LIMIT: z.enum(['on', 'off']).default('on'),

  /*
   * Credenciales de los proveedores OAuth (spec §5.6). Cada par va completo o no va: un proveedor
   * con sólo la mitad no puede entrar a nadie, y es un error de carga, no una opción. Sin el par,
   * el proveedor queda apagado.
   */
  GOOGLE_CLIENT_ID: optional(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: optional(z.string().min(1)),
  MICROSOFT_CLIENT_ID: optional(z.string().min(1)),
  MICROSOFT_CLIENT_SECRET: optional(z.string().min(1)),

  /*
   * El IdP de desarrollo (F9-03): lo que reemplaza al formulario de contraseña en local y en el
   * E2E. Un IdP que acepta a cualquiera, en producción, es un bypass de la autenticación, así que
   * el refine de abajo no deja levantar el proceso con esto prendido.
   */
  OAUTH_DEV_IDP: z.enum(['on', 'off']).default('off'),

  /*
   * Dónde está "Microsoft" para el proveedor `microsoft` de Better Auth. Sólo sirve para
   * apuntarlo al IdP falso y probar contra él el proveedor real; por eso exige `OAUTH_DEV_IDP`.
   */
  MICROSOFT_AUTHORITY: optional(httpUrl),
});

/** Los pares de credenciales: cada uno completo o ausente. */
const CREDENTIAL_PAIRS = [
  ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
] as const;

const guardedEnvSchema = envSchema.superRefine((env, ctx) => {
  const isProduction = env.NODE_ENV === 'production';

  if (isProduction && env.AUTH_RATE_LIMIT === 'off') {
    ctx.addIssue({
      code: 'custom',
      path: ['AUTH_RATE_LIMIT'],
      message: 'En producción el límite de intentos no se apaga (spec §13)',
    });
  }

  for (const [idName, secretName] of CREDENTIAL_PAIRS) {
    const hasId = env[idName] !== undefined;
    const hasSecret = env[secretName] !== undefined;

    if (hasId !== hasSecret) {
      const missing = hasId ? secretName : idName;
      ctx.addIssue({
        code: 'custom',
        path: [missing],
        message: `Falta ${missing}: el proveedor necesita ${idName} y ${secretName}, los dos (o ninguno)`,
      });
    }
  }

  if (isProduction && env.OAUTH_DEV_IDP === 'on') {
    ctx.addIssue({
      code: 'custom',
      path: ['OAUTH_DEV_IDP'],
      message: 'En producción el IdP de desarrollo no se prende: aceptaría a cualquiera (ADR-0012)',
    });
  }

  if (env.MICROSOFT_AUTHORITY !== undefined) {
    if (isProduction) {
      ctx.addIssue({
        code: 'custom',
        path: ['MICROSOFT_AUTHORITY'],
        message: 'En producción Microsoft no se desvía a otro servidor (ADR-0012)',
      });
    } else if (env.OAUTH_DEV_IDP !== 'on') {
      ctx.addIssue({
        code: 'custom',
        path: ['MICROSOFT_AUTHORITY'],
        message:
          'MICROSOFT_AUTHORITY sólo se usa con OAUTH_DEV_IDP=on: apunta Microsoft al IdP falso',
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = guardedEnvSchema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${detail}`);
  }

  return result.data;
}
