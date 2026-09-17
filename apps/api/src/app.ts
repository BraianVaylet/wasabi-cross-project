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
import type { DependencyProbe } from './modules/health/domain/readiness.ts';
import { healthRoutes } from './modules/health/infrastructure/health.routes.ts';
import { buildLoggerOptions } from './shared/logger.ts';
import { registerErrorHandler } from './shared/errors/error-handler.ts';

export const API_PREFIX = '/api/v1';

export interface BuildAppOptions {
  env: Env;
  /** Dependencias que mira `/ready`. Se inyectan para poder testear sin Mongo real. */
  probes?: readonly DependencyProbe[];
}

export async function buildApp({ env, probes = [] }: BuildAppOptions): Promise<FastifyInstance> {
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
        description:
          'Generado desde los schemas Zod de @wasabi-cross/schemas. No editar a mano.',
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

  return app;
}
