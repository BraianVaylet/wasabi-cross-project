import {
  addExerciseSchema,
  exerciseListSchema,
  exerciseSchema,
  managedExerciseSummarySchema,
  type AddExercise,
  type Exercise,
  type ExerciseList,
  type ManagedExerciseSummary,
  type Plan,
} from '@wasabi-cross/schemas';
import type { FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/app-error.ts';

const catalogResponse = z.object({ exercises: z.array(exerciseSchema) });
const catalogQuery = z.object({ q: z.string().trim().max(80).optional() });

interface SessionUser {
  id: string;
  plan: Plan;
}

export interface ExerciseRoutesOptions {
  /**
   * El guard llega inyectado en vez de importado del módulo `auth`: así `exercises` no
   * conoce el interior de otro módulo (docs/architecture.md).
   */
  requireSession: onRequestAsyncHookHandler;
  searchCatalog: (query: string | undefined) => Promise<Exercise[]>;
  addExercise: (user: SessionUser, input: AddExercise) => Promise<ManagedExerciseSummary>;
  listExercises: (user: SessionUser) => Promise<ExerciseList>;
}

function sessionUser(request: FastifyRequest): SessionUser {
  const user = request.currentUser;
  /* v8 ignore next 3 -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
  if (!user) {
    throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
  }

  // Sólo lo que el caso de uso necesita. El plan sale de la sesión, nunca del cliente.
  return { id: user.id, plan: user.plan };
}

export function exerciseRoutes(options: ExerciseRoutesOptions): FastifyPluginAsyncZod {
  const { requireSession, searchCatalog, addExercise, listExercises } = options;

  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/exercises/catalog',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Catálogo pre-cargado de ejercicios',
          description:
            'Los ejercicios que todo usuario ve por default. Con `q`, filtra por parte del ' +
            'nombre sin distinguir mayúsculas ni acentos.',
          tags: ['exercises'],
          querystring: catalogQuery,
          response: { 200: catalogResponse },
        },
      },
      async (request) => ({ exercises: await searchCatalog(request.query.q) }),
    );

    app.get(
      '/exercises',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Mis ejercicios',
          description: 'La lista de Home: cada ejercicio con su valor actual, y el uso del plan.',
          tags: ['exercises'],
          response: { 200: exerciseListSchema },
        },
      },
      async (request) => listExercises(sessionUser(request)),
    );

    app.post(
      '/exercises',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Agregar un ejercicio',
          description:
            'Uno del catálogo o uno propio, junto con su primera marca. Todo o nada. ' +
            'Respeta el cupo del plan (spec §4).',
          tags: ['exercises'],
          body: addExerciseSchema,
          response: { 201: managedExerciseSummarySchema },
        },
      },
      async (request, reply) => {
        const summary = await addExercise(sessionUser(request), request.body);
        return reply.status(201).send(summary);
      },
    );
  };
}
