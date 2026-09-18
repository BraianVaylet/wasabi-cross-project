import {
  historyQuerySchema,
  logRecordResponseSchema,
  managedExerciseIdSchema,
  recordHistorySchema,
  recordInputSchema,
  type LogRecordResponse,
  type RecordHistory,
  type RecordInput,
} from '@wasabi-cross/schemas';
import type { FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/app-error.ts';

// Un ID con otro formato se rechaza antes de buscar nada.
const managedExerciseParams = z.object({ id: managedExerciseIdSchema });

export interface RecordRoutesOptions {
  /** Inyectado, como en `exercises`: este módulo no conoce el interior de `auth`. */
  requireSession: onRequestAsyncHookHandler;
  logRecord: (
    userId: string,
    managedExerciseId: string,
    input: RecordInput,
  ) => Promise<LogRecordResponse>;
  recordHistory: (
    userId: string,
    managedExerciseId: string,
    page: { limit: number; cursor?: string },
  ) => Promise<RecordHistory>;
}

function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  /* v8 ignore next 3 -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
  if (!user) {
    throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
  }
  return user.id;
}

export function recordRoutes(options: RecordRoutesOptions): FastifyPluginAsyncZod {
  const { requireSession, logRecord, recordHistory } = options;

  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.post(
      '/exercises/:id/records',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Cargar una marca',
          description:
            'En la unidad que dicta la categoría del ejercicio. Sin fecha, asume ahora. ' +
            'Devuelve cómo quedaron el valor actual y la mejor marca. Uno ajeno responde 404.',
          tags: ['records'],
          params: managedExerciseParams,
          body: recordInputSchema,
          response: { 201: logRecordResponseSchema },
        },
      },
      async (request, reply) => {
        const result = await logRecord(sessionUserId(request), request.params.id, request.body);
        return reply.status(201).send(result);
      },
    );

    app.get(
      '/exercises/:id/records',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Historial de marcas',
          description:
            'Del más reciente al más viejo, paginado por cursor, con el valor actual y la ' +
            'mejor marca (spec §5.1). Uno ajeno responde 404.',
          tags: ['records'],
          params: managedExerciseParams,
          querystring: historyQuerySchema,
          response: { 200: recordHistorySchema },
        },
      },
      async (request) => {
        const { limit, cursor } = request.query;
        return recordHistory(sessionUserId(request), request.params.id, {
          limit,
          ...(cursor === undefined ? {} : { cursor }),
        });
      },
    );
  };
}
