import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.ts';
import type { Auth } from './modules/auth/infrastructure/better-auth.ts';
import { authRoutes } from './modules/auth/infrastructure/auth.routes.ts';
import { sessionRoutes } from './modules/auth/infrastructure/session.routes.ts';
import { requireSession } from './modules/auth/infrastructure/require-session.ts';
import {
  exerciseRoutes,
  type ExerciseRoutesOptions,
} from './modules/exercises/infrastructure/exercise.routes.ts';
import type { DependencyProbe } from './modules/health/domain/readiness.ts';
import { healthRoutes } from './modules/health/infrastructure/health.routes.ts';
import {
  recordRoutes,
  type RecordRoutesOptions,
} from './modules/records/infrastructure/record.routes.ts';
import {
  preferencesRoutes,
  type PreferencesRoutesOptions,
} from './modules/users/infrastructure/preferences.routes.ts';
import { buildLoggerOptions } from './shared/logger.ts';
import { registerErrorHandler } from './shared/errors/error-handler.ts';

export const API_PREFIX = '/api/v1';

export interface BuildAppOptions {
  env: Env;
  /** Dependencias que mira `/ready`. Se inyectan para poder testear sin Mongo real. */
  probes?: readonly DependencyProbe[];
  /** Sin `auth`, la app levanta sin endpoints de sesión — útil para tests de infra. */
  auth?: Auth;
  /** Se registra sólo junto con `auth`, como todo lo que es de un usuario. */
  users?: Omit<PreferencesRoutesOptions, 'requireSession'>;
  /** Se registra sólo junto con `auth`: los ejercicios son para usuarios con sesión. */
  exercises?: Omit<ExerciseRoutesOptions, 'requireSession'>;
  /** Igual que `exercises`: las marcas son de usuarios con sesión. */
  records?: Omit<RecordRoutesOptions, 'requireSession'>;
}

export async function buildApp({
  env,
  probes = [],
  auth,
  users,
  exercises,
  records,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(env),
    // El requestId viaja del front al back y vuelve al usuario en el error,
    // para poder correlacionar un reporte de soporte con el log exacto.
    genReqId: (request) => {
      const incoming = request.headers['x-request-id'];
      return typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    },
    requestIdHeader: 'x-request-id',
  }).withTypeProvider<ZodTypeProvider>();

  // Zod valida la entrada y serializa la salida: una sola definición para validar,
  // tipar y generar el OpenAPI.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
  });

  // CORS restrictivo por origen (spec §13): sólo el front, con credenciales.
  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Wasabi Cross API',
        description: 'Generado desde los schemas Zod de @wasabi-cross/schemas. No editar a mano.',
        version: '1.0.0',
      },
      servers: [{ url: API_PREFIX }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });

  registerErrorHandler(app);

  // Liveness y readiness van fuera de /api/v1: los consume el orquestador, no el front.
  await app.register(healthRoutes(probes));

  if (auth) {
    // Better Auth sirve sus propias rutas bajo /api/auth, fuera del versionado:
    // el contrato de esas rutas lo define la librería, no nosotros.
    await app.register(authRoutes(auth));
    await app.register(sessionRoutes(auth), { prefix: API_PREFIX });

    if (users) {
      await app.register(preferencesRoutes({ ...users, requireSession: requireSession(auth) }), {
        prefix: API_PREFIX,
      });
    }

    if (exercises) {
      await app.register(exerciseRoutes({ ...exercises, requireSession: requireSession(auth) }), {
        prefix: API_PREFIX,
      });
    }

    if (records) {
      await app.register(recordRoutes({ ...records, requireSession: requireSession(auth) }), {
        prefix: API_PREFIX,
      });
    }
  }

  return app;
}
