import { z } from 'zod';

/** `WC-<MÓDULO>-<HTTP>-<NNN>`, el formato de docs/error-codes.md. */
export const errorCodeSchema = z.string().regex(/^WC-[A-Z]+-\d{3}-\d{3}$/);

/**
 * Envelope único de error: todo error que sale de la API tiene esta forma, así el front no
 * adivina según el endpoint. Vive acá porque lo escribe la API y lo lee el front.
 */
export const errorEnvelopeSchema = z.object({
  errorCode: errorCodeSchema,
  message: z.string(),
  requestId: z.string(),
  /** Errores por campo, sólo en fallos de validación de entrada. */
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

/**
 * Catálogo de códigos de error: el status HTTP y el mensaje al usuario de cada uno. Espejo
 * exacto de la tabla de `docs/error-codes.md`: un test de la API compara las dos fuentes y
 * falla si divergen. Vive acá porque lo usan la API y el front.
 */
export const ERROR_CATALOG = {
  'WC-AUTH-401-001': { status: 401, userMessage: 'Email o contraseña incorrectos.' },
  'WC-AUTH-403-002': { status: 403, userMessage: 'No tenés permisos para esta acción.' },
  'WC-AUTH-429-003': { status: 429, userMessage: 'Demasiados intentos. Probá en 5 minutos.' },
  'WC-AUTH-401-004': { status: 401, userMessage: 'Iniciá sesión para continuar.' },
  'WC-EXO-404-002': { status: 404, userMessage: 'No encontramos ese ejercicio.' },
  'WC-EXO-409-003': { status: 409, userMessage: 'Ya tenés ese ejercicio en tu lista.' },
  'WC-EXO-409-004': {
    status: 409,
    userMessage: 'Ese ejercicio ya existe en el catálogo: elegilo de la lista.',
  },
  'WC-RM-422-001': { status: 422, userMessage: 'El valor cargado no es válido.' },
  'WC-RM-404-002': { status: 404, userMessage: 'No encontramos ese registro.' },
  'WC-SUBS-403-001': {
    status: 403,
    userMessage: 'Alcanzaste el máximo de {limite} de tu plan {plan}.',
  },
  'WC-BILL-402-001': { status: 402, userMessage: 'El pago fue rechazado por el emisor.' },
  'WC-BILL-409-002': { status: 409, userMessage: 'Este pago ya fue registrado.' },
  'WC-SYS-400-002': { status: 400, userMessage: 'Revisá los datos enviados.' },
  'WC-SYS-404-003': { status: 404, userMessage: 'No encontramos lo que buscás.' },
  'WC-SYS-500-001': {
    status: 500,
    userMessage: 'Ocurrió un error. Compartí el código {code} con soporte.',
  },
  // Lo genera el front, nunca la API: no hubo respuesta, o no era el envelope.
  'WC-SYS-503-004': {
    status: 503,
    userMessage: 'No pudimos conectarnos con el servidor. Probá de nuevo en un rato.',
  },
} as const satisfies Record<string, { status: number; userMessage: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_CATALOG, value);
}
