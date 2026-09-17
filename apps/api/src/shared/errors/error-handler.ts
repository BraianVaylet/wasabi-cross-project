import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';
import { AppError, isAppError } from './app-error.ts';

/**
 * Envelope único de error. Todo error que sale de la API tiene esta forma —
 * el front no tiene que adivinar según el endpoint.
 */
export interface ErrorEnvelope {
  errorCode: string;
  message: string;
  requestId: string;
  /** Errores por campo, sólo en fallos de validación de entrada. */
  details?: { path: string; message: string }[];
}

function send(reply: FastifyReply, status: number, envelope: ErrorEnvelope): void {
  void reply.status(status).send(envelope);
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    const error = new AppError('WC-SYS-404-003', { meta: { url: request.url } });
    request.log.info({ errorCode: error.errorCode, ...error.meta }, error.message);
    send(reply, error.statusCode, {
      errorCode: error.errorCode,
      message: error.userMessage,
      requestId: request.id,
    });
  });

  app.setErrorHandler((error: unknown, request: FastifyRequest, reply: FastifyReply) => {
    // 1. Validación de entrada: es culpa del cliente y se responde con el detalle por campo.
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.') || '(raíz)',
        message: issue.message ?? 'Valor inválido',
      }));
      request.log.info({ errorCode: 'WC-SYS-400-002', details }, 'Entrada inválida');
      send(reply, 400, {
        errorCode: 'WC-SYS-400-002',
        message: 'Revisá los datos enviados.',
        requestId: request.id,
        details,
      });
      return;
    }

    // 2. La respuesta no coincide con su propio schema: es un bug nuestro, no del cliente.
    if (isResponseSerializationError(error)) {
      request.log.error(
        { errorCode: 'WC-SYS-500-001', method: error.method, url: error.url },
        'La respuesta no valida contra su schema',
      );
      send(reply, 500, {
        errorCode: 'WC-SYS-500-001',
        message: 'Ocurrió un error. Compartí el código WC-SYS-500-001 con soporte.',
        requestId: request.id,
      });
      return;
    }

    // 3. Error de negocio con código del catálogo.
    if (isAppError(error)) {
      const log = error.statusCode >= 500 ? request.log.error : request.log.warn;
      log.call(
        request.log,
        { errorCode: error.errorCode, ...error.meta },
        error.message,
      );
      send(reply, error.statusCode, {
        errorCode: error.errorCode,
        message: error.userMessage,
        requestId: request.id,
      });
      return;
    }

    // 4. Rate limit (@fastify/rate-limit responde 429 sin pasar por AppError).
    if (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 429) {
      request.log.warn({ errorCode: 'WC-AUTH-429-003', url: request.url }, 'Rate limit alcanzado');
      send(reply, 429, {
        errorCode: 'WC-AUTH-429-003',
        message: 'Demasiados intentos. Probá en 5 minutos.',
        requestId: request.id,
      });
      return;
    }

    // 5. Cualquier otra cosa es un error no controlado: se loguea entero, se responde genérico.
    // Nunca se filtra el stack ni el mensaje interno al cliente.
    request.log.error({ errorCode: 'WC-SYS-500-001', err: error }, 'Error no controlado');
    send(reply, 500, {
      errorCode: 'WC-SYS-500-001',
      message: 'Ocurrió un error. Compartí el código WC-SYS-500-001 con soporte.',
      requestId: request.id,
    });
  });
}
