import { z } from 'zod';

/**
 * Configuración del proceso, validada al arrancar. Si falta o está mal una variable,
 * el proceso no levanta: es preferible un arranque roto a una API a medio configurar.
 */
const httpUrl = z.url({ protocol: /^https?$/ });

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
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${detail}`);
  }

  return result.data;
}
