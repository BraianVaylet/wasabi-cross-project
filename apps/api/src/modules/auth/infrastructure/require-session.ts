import { planSchema } from '@wasabi-cross/schemas';
import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { AppError } from '../../../shared/errors/app-error.ts';
import type { AuthenticatedUser } from '../domain/authenticated-user.ts';
import type { Auth } from './better-auth.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** Presente sólo en rutas que pasaron por `requireSession`. */
    currentUser?: AuthenticatedUser;
  }
}

/**
 * Guard de sesión. Se aplica por ruta y no global: un endpoint queda protegido porque
 * alguien lo decidió, no porque se olvidó de excluirlo de una lista.
 *
 * Va en `onRequest`, el primer hook del ciclo de Fastify, y no en `preHandler`: la
 * validación del cuerpo corre antes de `preHandler`, así que ahí un request sin sesión
 * con un cuerpo inválido recibía 400 en vez de 401 — podía sondear el contrato de la API
 * sin estar autenticado, y el servidor parseaba cuerpos de desconocidos.
 */
export function requireSession(auth: Auth): onRequestAsyncHookHandler {
  return async function requireSessionHook(request: FastifyRequest, _reply: FastifyReply) {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });

    if (!session) {
      throw new AppError('WC-AUTH-401-004', { meta: { url: request.url } });
    }

    const { user } = session;
    // El plan puede no estar si el documento es viejo o lo tocó una migración;
    // `free` es el default seguro: da menos permisos, no más.
    const plan = planSchema.catch('free').parse(user.plan);

    request.currentUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan,
    };
  };
}
