import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { checkReadiness } from '../application/check-readiness.ts';
import type { DependencyProbe } from '../domain/readiness.ts';

const livenessResponse = z.object({
  status: z.literal('ok'),
  uptimeSeconds: z.number(),
});

const readinessResponse = z.object({
  status: z.enum(['ready', 'not-ready']),
  checks: z.array(z.object({ name: z.string(), ok: z.boolean() })),
});

export function healthRoutes(probes: readonly DependencyProbe[]): FastifyPluginAsyncZod {
  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/health',
      {
        schema: {
          summary: 'Liveness',
          description: 'El proceso está vivo. No toca Mongo ni ninguna dependencia externa.',
          tags: ['health'],
          response: { 200: livenessResponse },
        },
      },
      () => ({ status: 'ok' as const, uptimeSeconds: Math.round(process.uptime()) }),
    );

    app.get(
      '/ready',
      {
        schema: {
          summary: 'Readiness',
          description: 'Hace ping a Mongo. Si falla, el orquestador no debe enrutar tráfico acá.',
          tags: ['health'],
          response: { 200: readinessResponse, 503: readinessResponse },
        },
      },
      async (_request, reply) => {
        const report = await checkReadiness(probes);

        return reply.status(report.ready ? 200 : 503).send({
          status: report.ready ? ('ready' as const) : ('not-ready' as const),
          checks: report.checks,
        });
      },
    );
  };
}
