/**
 * El `tid` fijo de Microsoft para las cuentas personales (Outlook, Hotmail, Live).
 * @see https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference
 */
export const MICROSOFT_CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';

/** Dónde está Microsoft: el servidor real, o el IdP falso de desarrollo (`MICROSOFT_AUTHORITY`). */
export const MICROSOFT_DEFAULT_AUTHORITY = 'https://login.microsoftonline.com';

export interface MicrosoftClaimsExpectation {
  /** La `authority` con la que se armó el proveedor (sin barra final, o con: se ignora). */
  authority: string;
  /** El id de cliente de Wasabi en Microsoft: la audiencia del ID token. */
  clientId: string;
}

/**
 * Los claims de un ID token, o `null` si el texto no es un JWT con un objeto de payload. No verifica
 * la firma: en el flujo con `code` el token llega directo del endpoint de Microsoft por TLS, y es
 * eso lo que lo autentica (OIDC Core §3.1.3.7); acá sólo se lo lee para chequearlo.
 */
export function decodeIdTokenClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || !payload) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return Object.fromEntries(Object.entries(parsed));
  } catch {
    return null;
  }
}

/**
 * ¿Es el token de una cuenta **personal** de Microsoft, emitido para este cliente? Chequea que el
 * `tid` sea el de las cuentas personales, que el `iss` sea `<authority>/<tid>/v2.0` y que la
 * audiencia sea este cliente.
 *
 * Better Auth tiene este chequeo (`verifyClaims`), pero sólo lo corre cuando llega un ID token
 * suelto, no en el flujo con `code`, que es el nuestro (F9-03). En producción lo que deja afuera a
 * las cuentas de trabajo es el endpoint `/consumers`, que no las emite; esto lo vuelve a exigir por
 * si alguien cambia el tenant o el servidor responde cualquier cosa (ADR-0012).
 */
export function isConsumerMicrosoftToken(
  claims: Record<string, unknown>,
  { authority, clientId }: MicrosoftClaimsExpectation,
): boolean {
  const { tid, iss, aud } = claims;
  if (typeof tid !== 'string' || tid !== MICROSOFT_CONSUMER_TENANT_ID) return false;
  if (typeof iss !== 'string' || iss !== `${authority.replace(/\/+$/, '')}/${tid}/v2.0`)
    return false;

  const audiences = Array.isArray(aud) ? aud : [aud];
  return audiences.includes(clientId);
}
