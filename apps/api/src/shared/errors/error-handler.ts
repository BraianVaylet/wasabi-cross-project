import { ERROR_CATALOG, type ErrorEnvelope } from '@wasabi-cross/schemas';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError, isAppError } from './app-error.ts';
import type { SpaFallback } from '../http/web-front.ts';

/** El mensaje del catálogo con su `{code}` ya reemplazado. */
function unexpectedMessage(): string {
  return ERROR_CATALOG['WC-SYS-500-001'].userMessage.replace('{code}', 'WC-SYS-500-001');
}

/** El 4xx de un error que ya trae su código (los de Fastify), o `null` si no es del cliente. */
function clientErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return null;
  }
  const { statusCode } = error;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500
    ? statusCode
    : null;
}

/** El código interno de Fastify (`FST_ERR_CTP_...`), que sirve para el log y nada más. */
function fastifyCode(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : undefined;
}

function send(reply: FastifyReply, status: number, envelope: ErrorEnvelope): void {
  void reply.status(status).send(envelope);
}

export interface ErrorHandlerOptions {
  /** Si la API sirve el front, las navegaciones de la SPA caen en su `index.html`. */
  spaFallback?: SpaFallback;
}

export function registerErrorHandler(
  app: FastifyInstance,
  options: ErrorHandlerOptions = {},
): void {
  app.setNotFoundHandler((request, reply) => {
    if (options.spaFallback?.(request, reply)) {
      return;
    }

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

    // 5. Errores del cliente que detecta Fastify antes de llegar a la ruta: un JSON roto, un
    // cuerpo demasiado grande, un tipo de contenido que no entiende. Traen su 4xx, y un 500
    // acá sería mentir: dispararía alertas por algo que no es nuestro (F3-02).
    const clientStatus = clientErrorStatus(error);
    if (clientStatus !== null) {
      request.log.warn(
        { errorCode: 'WC-SYS-400-002', status: clientStatus, code: fastifyCode(error) },
        'Pedido rechazado por el servidor HTTP',
      );
      send(reply, clientStatus, {
        errorCode: 'WC-SYS-400-002',
        message: ERROR_CATALOG['WC-SYS-400-002'].userMessage,
        requestId: request.id,
      });
      return;
    }

    // 6. Cualquier otra cosa es un error no controlado: se loguea entero, se responde genérico.
    // Nunca se filtra el stack ni el mensaje interno al cliente.
    request.log.error({ errorCode: 'WC-SYS-500-001', err: error }, 'Error no controlado');
    send(reply, 500, {
      errorCode: 'WC-SYS-500-001',
      message: unexpectedMessage(),
      requestId: request.id,
    });
  });
}
