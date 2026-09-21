import { ERROR_CATALOG, type ErrorEnvelope } from '@wasabi-cross/schemas';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError, isAppError } from './app-error.ts';

/** El mensaje del catálogo con su `{code}` ya reemplazado. */
function unexpectedMessage(): string {
  return ERROR_CATALOG['WC-SYS-500-001'].userMessage.replace('{code}', 'WC-SYS-500-001');
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
        message: ERROR_CATALOG['WC-SYS-400-002'].userMessage,
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
        message: unexpectedMessage(),
        requestId: request.id,
      });
      return;
    }

    // 3. Error de negocio con código del catálogo.
    if (isAppError(error)) {
      const log = error.statusCode >= 500 ? request.log.error : request.log.warn;
      log.call(request.log, { errorCode: error.errorCode, ...error.meta }, error.message);
      send(reply, error.statusCode, {
        errorCode: error.errorCode,
        message: error.userMessage,
        requestId: request.id,
        ...(error.details ? { details: [...error.details] } : {}),
      });
      return;
    }

    // 4. Rate limit (@fastify/rate-limit responde 429 sin pasar por AppError).
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 429
    ) {
      request.log.warn({ errorCode: 'WC-AUTH-429-003', url: request.url }, 'Rate limit alcanzado');
      send(reply, 429, {
        errorCode: 'WC-AUTH-429-003',
        message: ERROR_CATALOG['WC-AUTH-429-003'].userMessage,
        requestId: request.id,
      });
      return;
    }

    // 5. Cualquier otra cosa es un error no controlado: se loguea entero, se responde genérico.
    // Nunca se filtra el stack ni el mensaje interno al cliente.
    request.log.error({ errorCode: 'WC-SYS-500-001', err: error }, 'Error no controlado');
    send(reply, 500, {
      errorCode: 'WC-SYS-500-001',
      message: unexpectedMessage(),
      requestId: request.id,
    });
  });
}
