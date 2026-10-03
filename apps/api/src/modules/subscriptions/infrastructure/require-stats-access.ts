import { canViewStats } from '@wasabi-cross/schemas';
import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import { AppError } from '../../../shared/errors/app-error.ts';

/**
 * Guard de plan: las estadísticas son de Pro (spec §4). Va después de `requireSession`, que
 * puebla `request.currentUser`, y antes de validar nada: un usuario Free recibe 403 aunque el
 * ejercicio no exista o la consulta venga mal formada, así que no puede usar la API para
 * sondear qué hay del otro lado.
 *
 * Es la regla, no una cortesía: el front además evita pedir los datos (spec §5.5), pero quien
 * decide es éste. Va en `onRequest` por la misma razón que el guard de sesión (docs/architecture.md).
 *
 * El plan sale de la sesión, que lo lee de la base en cada pedido: un cambio de plan rige desde el
 * pedido siguiente, sin cerrar sesión.
 */
export function requireStatsAccess(): onRequestAsyncHookHandler {
  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del hook de Fastify es async
  return async function requireStatsAccessHook(request: FastifyRequest, _reply: FastifyReply) {
    const user = request.currentUser;
    /* v8 ignore next 3 -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
    if (!user) {
      throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
    }

    if (!canViewStats(user.plan)) {
      throw new AppError('WC-SUBS-403-002', {
        meta: { userId: user.id, plan: user.plan, url: request.url },
      });
    }
  };
}
