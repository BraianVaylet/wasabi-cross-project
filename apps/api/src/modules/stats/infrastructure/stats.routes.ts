import {
  exerciseStatsSchema,
  generalStatsSchema,
  managedExerciseIdSchema,
  statsQuerySchema,
  trainingActivitySchema,
  trainingBreakdownSchema,
  type ExerciseStats,
  type GeneralStats,
  type StatsPeriod,
  type TrainingActivity,
  type TrainingBreakdown,
} from '@wasabi-cross/schemas';
import type { FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/app-error.ts';

const managedExerciseParams = z.object({ id: managedExerciseIdSchema });

export interface StatsRoutesOptions {
  requireSession: onRequestAsyncHookHandler;
  /**
   * Las estadísticas son de Pro (spec §4). Llega inyectado, como `requireSession`: `stats` no
   * conoce el interior de `subscriptions`. Corre después de la sesión.
   */
  requireStatsAccess: onRequestAsyncHookHandler;
  exerciseStats: (
    userId: string,
    managedExerciseId: string,
    period: StatsPeriod,
  ) => Promise<ExerciseStats>;
  generalStats: (userId: string, period: StatsPeriod) => Promise<GeneralStats>;
  trainingBreakdown: (userId: string) => Promise<TrainingBreakdown>;
  trainingActivity: (userId: string, period: StatsPeriod) => Promise<TrainingActivity>;
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
  const {
    requireSession,
    requireStatsAccess,
    exerciseStats,
    generalStats,
    trainingBreakdown,
    trainingActivity,
  } = options;
  // Primero la sesión (401), después el plan (403): sin sesión no hay plan que mirar.
  const onRequest = [requireSession, requireStatsAccess];

  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/stats/exercises/:id',
      {
        onRequest,
        schema: {
          summary: 'Estadísticas de un ejercicio',
          description:
            'La serie de marcas del período y sus números: la actual, la mejor, la peor y ' +
            'la variación. En tiempo, la mejor es la menor (spec §5.1). Uno ajeno responde 404. ' +
            'Sólo plan Pro: con Free responde 403 `WC-SUBS-403-002` (spec §4).',
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
        onRequest,
        schema: {
          summary: 'Estadísticas generales',
          description:
            'Cómo viene cada capacidad y cada grupo muscular en el período. Se promedian ' +
            'variaciones y no valores, así no se mezclan kilos con segundos (spec §5). Lo ' +
            'que no tiene marcas suficientes se informa aparte, no en cero. ' +
            'Sólo plan Pro: con Free responde 403 `WC-SUBS-403-002` (spec §4).',
          tags: ['stats'],
          querystring: statsQuerySchema,
          response: { 200: generalStatsSchema },
        },
      },
      async (request) => generalStats(sessionUserId(request), request.query.period),
    );

    app.get(
      '/stats/breakdown',
      {
        onRequest,
        schema: {
          summary: 'Cómo se reparte el entrenamiento',
          description:
            'Los ejercicios del usuario por disciplina, categoría, segmento y grupo muscular ' +
            '(spec §5.4). Un ejercicio cuenta entero en cada disciplina que tiene; en los ' +
            'grupos, el primario suma 1 y cada secundario ½. Sin período: mira la lista. ' +
            'Sólo plan Pro: con Free responde 403 `WC-SUBS-403-002` (spec §4).',
          tags: ['stats'],
          response: { 200: trainingBreakdownSchema },
        },
      },
      async (request) => trainingBreakdown(sessionUserId(request)),
    );

    app.get(
      '/stats/activity',
      {
        onRequest,
        schema: {
          summary: 'Constancia, récords y para retestear',
          description:
            'Las marcas del período, por mes y en total; las mejores marcas nuevas (las que ' +
            'superaron a todas las anteriores de su ejercicio); los tres que más mejoraron; y, ' +
            'sin mirar el período, la última marca y los ejercicios con más de 8 semanas sin ' +
            'una (spec §5.4). ' +
            'Sólo plan Pro: con Free responde 403 `WC-SUBS-403-002` (spec §4).',
          tags: ['stats'],
          querystring: statsQuerySchema,
          response: { 200: trainingActivitySchema },
        },
      },
      async (request) => trainingActivity(sessionUserId(request), request.query.period),
    );
  };
}
