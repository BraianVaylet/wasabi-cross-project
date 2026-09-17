/**
 * Catálogo de códigos de error `WC-<MÓDULO>-<HTTP>-<NNN>`.
 *
 * Espejo exacto de la tabla de `docs/error-codes.md`. No es documentación duplicada por
 * comodidad: `error-codes.test.ts` compara ambas fuentes y falla si divergen, así que un
 * código nuevo en el código sin entrada en el diccionario rompe el build.
 */
export const ERROR_CATALOG = {
  'WC-AUTH-401-001': { status: 401, userMessage: 'Email o contraseña incorrectos.' },
  'WC-AUTH-403-002': { status: 403, userMessage: 'No tenés permisos para esta acción.' },
  'WC-AUTH-429-003': { status: 429, userMessage: 'Demasiados intentos. Probá en 5 minutos.' },
  'WC-EXO-403-001': {
    status: 403,
    userMessage: 'Alcanzaste el máximo de ejercicios de tu plan {plan}.',
  },
  'WC-EXO-404-002': { status: 404, userMessage: 'No encontramos ese ejercicio.' },
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
} as const satisfies Record<string, { status: number; userMessage: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_CATALOG, value);
}
