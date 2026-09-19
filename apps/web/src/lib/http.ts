import {
  ERROR_CATALOG,
  errorEnvelopeSchema,
  type ErrorCode,
  type ErrorEnvelope,
} from '@wasabi-cross/schemas';
import type { z } from 'zod';

/**
 * Lo genera el front, nunca la API: no hubo respuesta, o la que hubo no es el envelope (un
 * proxy caído que devuelve HTML). Ver docs/error-codes.md.
 */
export const UNREACHABLE_ERROR_CODE = 'WC-SYS-503-004' satisfies ErrorCode;
const UNREACHABLE_MESSAGE = ERROR_CATALOG[UNREACHABLE_ERROR_CODE].userMessage;

/**
 * Un error que la UI puede mostrar y el usuario reportar: siempre trae el código y el
 * requestId, que es lo que soporte necesita para encontrar el log exacto.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly requestId: string;
  readonly details: NonNullable<ErrorEnvelope['details']>;

  constructor(
    status: number,
    errorCode: string,
    message: string,
    requestId: string,
    details: ErrorEnvelope['details'] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export interface HttpClient {
  request: <TSchema extends z.ZodType>(
    schema: TSchema,
    path: string,
    options?: RequestOptions,
  ) => Promise<z.infer<TSchema>>;
}

export interface HttpClientOptions {
  /** La URL de la API. Vacía, pega al mismo origen. */
  baseUrl: string;
  fetch?: typeof fetch;
  newRequestId?: () => string;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * El único camino del front a la API. Manda el `x-request-id` que la API usa en sus logs y
 * devuelve en el error, valida la respuesta con el schema compartido, y convierte cualquier
 * falla en un `ApiError`.
 */
export function createHttpClient({
  baseUrl,
  fetch: fetchImpl = (...args) => globalThis.fetch(...args),
  newRequestId = () => crypto.randomUUID(),
}: HttpClientOptions): HttpClient {
  return {
    request: async (schema, path, { method = 'GET', body } = {}) => {
      const requestId = newRequestId();
      const headers = new Headers({ 'x-request-id': requestId });
      if (body !== undefined) {
        headers.set('content-type', 'application/json');
      }

      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}${path}`, {
          method,
          headers,
          // La sesión es una cookie httpOnly: el front nunca ve el token (spec §13).
          credentials: 'include',
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      } catch {
        throw new ApiError(0, UNREACHABLE_ERROR_CODE, UNREACHABLE_MESSAGE, requestId);
      }

      const payload = response.status === 204 ? undefined : await readJson(response);

      if (!response.ok) {
        const envelope = errorEnvelopeSchema.safeParse(payload);
        if (!envelope.success) {
          throw new ApiError(
            response.status,
            UNREACHABLE_ERROR_CODE,
            UNREACHABLE_MESSAGE,
            requestId,
          );
        }
        const { errorCode, message, requestId: echoed, details } = envelope.data;
        throw new ApiError(response.status, errorCode, message, echoed, details);
      }

      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        // Un bug de contrato entre front y API, no algo que el usuario pueda arreglar.
        throw new Error(`Respuesta de la API fuera de contrato en ${method} ${path}`, {
          cause: parsed.error,
        });
      }
      return parsed.data;
    },
  };
}
