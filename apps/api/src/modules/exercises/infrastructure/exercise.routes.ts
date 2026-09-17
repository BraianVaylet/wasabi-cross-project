import { exerciseSchema } from '@wasabi-cross/schemas';
import type { preHandlerAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';

const catalogResponse = z.object({
  exercises: z.array(exerciseSchema),
});

export interface ExerciseRoutesOptions {
  repository: ExerciseRepository;
  /**
   * El guard llega inyectado en vez de importado del módulo `auth`: así `exercises` no
   * conoce el interior de otro módulo (docs/architecture.md).
   */
  requireSession: preHandlerAsyncHookHandler;
}

export function exerciseRoutes({
  repository,
  requireSession,
}: ExerciseRoutesOptions): FastifyPluginAsyncZod {
  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/exercises/catalog',
      {
        preHandler: requireSession,
        schema: {
          summary: 'Catálogo pre-cargado de ejercicios',
          description:
            'Los ejercicios que todo usuario ve por default, sin tener que cargarlos a mano.',
          tags: ['exercises'],
          response: { 200: catalogResponse },
        },
      },
      async () => ({ exercises: await repository.findCatalog() }),
    );
  };
}
