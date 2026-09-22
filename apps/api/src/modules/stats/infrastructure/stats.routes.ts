import {
  exerciseStatsSchema,
  generalStatsSchema,
  managedExerciseIdSchema,
  statsQuerySchema,
  type ExerciseStats,
  type GeneralStats,
  type StatsPeriod,
} from '@wasabi-cross/schemas';
import type { FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/app-error.ts';

const managedExerciseParams = z.object({ id: managedExerciseIdSchema });

export interface StatsRoutesOptions {
  requireSession: onRequestAsyncHookHandler;
  exerciseStats: (
    userId: string,
    managedExerciseId: string,
    period: StatsPeriod,
  ) => Promise<ExerciseStats>;
  generalStats: (userId: string, period: StatsPeriod) => Promise<GeneralStats>;
}

function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  /* v8 ignore next 3 -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
  if (!user) {
    throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
  }
  return user.id;
}

export function statsRoutes(options: StatsRoutesOptions): FastifyPluginAsyncZod {
  const { requireSession, exerciseStats, generalStats } = options;

  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/stats/exercises/:id',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Estadísticas de un ejercicio',
          description:
            'La serie de marcas del período y sus números: la actual, la mejor, la peor y ' +
            'la variación. En tiempo, la mejor es la menor (spec §5.1). Uno ajeno responde 404.',
          tags: ['stats'],
          params: managedExerciseParams,
          querystring: statsQuerySchema,
          response: { 200: exerciseStatsSchema },
        },
      },
      async (request) =>
        exerciseStats(sessionUserId(request), request.params.id, request.query.period),
    );

    app.get(
      '/stats/summary',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Estadísticas generales',
          description:
            'Cómo viene cada capacidad y cada grupo muscular en el período. Se promedian ' +
            'variaciones y no valores, así no se mezclan kilos con segundos (spec §5). Lo ' +
            'que no tiene marcas suficientes se informa aparte, no en cero.',
          tags: ['stats'],
          querystring: statsQuerySchema,
          response: { 200: generalStatsSchema },
        },
      },
      async (request) => generalStats(sessionUserId(request), request.query.period),
    );
  };
}
