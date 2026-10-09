import {
  MICROSOFT_CONSUMER_TENANT_ID,
  MICROSOFT_DEFAULT_AUTHORITY,
  decodeIdTokenClaims,
} from './microsoft-claims.ts';

/*
 * El informe de un ID token de Microsoft (F9-10, ADR-0012): qué claims trae y qué decidiría la API con
 * ellos. Sirve con una cuenta real de Outlook, para saber si su email llega verificado antes de dar
 * por buena la cuenta; el runbook (`docs/runbooks/oauth.md`) dice cómo usarlo.
 *
 * Nunca devuelve el valor de un claim personal (el email, el nombre, el `oid`, el `sub`): del token se
 * cuentan los nombres y se responden preguntas de sí o no. Es lo que permite pegar el resultado en una
 * bitácora sin filtrar a nadie.
 */

export interface IdTokenReportOptions {
  /** El `MICROSOFT_CLIENT_ID` con el que se pidió el token: sin él no se afirma nada de la audiencia. */
  clientId?: string;
  /** Por defecto, el servidor real de Microsoft. */
  authority?: string;
}

export interface IdTokenReport {
  /** Si el texto es un JWT con un objeto de payload. Lo que sigue sólo tiene sentido si lo es. */
  decodable: boolean;
  /** Los nombres de todos los claims, ordenados. Sólo nombres. */
  claimNames: string[];
  /** Cuáles de los claims que importan para el ingreso trae. */
  present: Record<WatchedClaim, boolean>;
  account: 'personal' | 'organizacion' | 'desconocida';
  tenantId: string | null;
  /** Lo que haría la API (la misma regla que Better Auth, para el proveedor `microsoft`). */
  emailVerified: { verified: boolean; because: string };
  /** `iss` = `<authority>/<tid>/v2.0`. `null` si falta alguno de los dos. */
  issuerMatches: boolean | null;
  /** `aud` incluye el id de cliente. `null` si no se dio el id de cliente o el token no trae `aud`. */
  audienceMatches: boolean | null;
  /** `exp` ya pasó. `null` si no hay `exp`. */
  expired: boolean | null;
}

const WATCHED = [
  'email',
  'email_verified',
  'verified_primary_email',
  'verified_secondary_email',
  'oid',
  'sub',
  'name',
  'tid',
] as const;

type WatchedClaim = (typeof WATCHED)[number];

function includesEmail(value: unknown, email: string): boolean {
  return Array.isArray(value) && value.includes(email);
}

/**
 * La regla de Better Auth para el proveedor de Microsoft: `email_verified` si viene, y si no, que el
 * email esté en `verified_primary_email` o en `verified_secondary_email` (claims opcionales del ID
 * token, que hay que pedir en el registro de la app).
 */
function emailVerification(claims: Record<string, unknown>): IdTokenReport['emailVerified'] {
  const { email, email_verified: flag, verified_primary_email: primary } = claims;
  const secondary = claims.verified_secondary_email;

  if (flag !== undefined) {
    if (typeof flag !== 'boolean') {
      return { verified: false, because: 'email_verified no es un booleano' };
    }
    return { verified: flag, because: `email_verified es ${String(flag)}` };
  }
  if (typeof email !== 'string' || email === '') {
    return { verified: false, because: 'el token no trae email' };
  }
  if (includesEmail(primary, email)) {
    return { verified: true, because: 'verified_primary_email incluye el email' };
  }
  if (includesEmail(secondary, email)) {
    return { verified: true, because: 'verified_secondary_email incluye el email' };
  }
  if (primary === undefined && secondary === undefined) {
    return {
      verified: false,
      because:
        'el token no trae email_verified ni verified_primary_email ni verified_secondary_email',
    };
  }
  return {
    verified: false,
    because: 'verified_primary_email y verified_secondary_email no incluyen el email',
  };
}

export function describeIdToken(token: string, options: IdTokenReportOptions = {}): IdTokenReport {
  const claims = decodeIdTokenClaims(token.trim());

  if (!claims) {
    return {
      decodable: false,
      claimNames: [],
      present: Object.fromEntries(WATCHED.map((name) => [name, false])) as Record<
        WatchedClaim,
        boolean
      >,
      account: 'desconocida',
      tenantId: null,
      emailVerified: { verified: false, because: 'el texto no es un ID token' },
      issuerMatches: null,
      audienceMatches: null,
      expired: null,
    };
  }

  const { tid, iss, aud, exp } = claims;
  const tenantId = typeof tid === 'string' ? tid : null;
  const authority = (options.authority ?? MICROSOFT_DEFAULT_AUTHORITY).replace(/\/+$/, '');

  let account: IdTokenReport['account'] = 'desconocida';
  if (tenantId !== null) {
    account = tenantId === MICROSOFT_CONSUMER_TENANT_ID ? 'personal' : 'organizacion';
  }

  let audienceMatches: boolean | null = null;
  if (options.clientId !== undefined && aud !== undefined) {
    audienceMatches = (Array.isArray(aud) ? aud : [aud]).includes(options.clientId);
  }

  return {
    decodable: true,
    claimNames: Object.keys(claims).sort(),
    present: Object.fromEntries(
      WATCHED.map((name) => [name, claims[name] !== undefined]),
    ) as Record<WatchedClaim, boolean>,
    account,
    tenantId,
    emailVerified: emailVerification(claims),
    issuerMatches:
      tenantId === null || typeof iss !== 'string' ? null : iss === `${authority}/${tenantId}/v2.0`,
    audienceMatches,
    expired: typeof exp === 'number' ? exp * 1000 < Date.now() : null,
  };
}

const YES_NO = (value: boolean): string => (value ? 'sí' : 'no');

function matches(label: string, value: boolean | null, ok: string, bad: string): string {
  if (value === null) {
    return `${label}: sin datos para compararlo`;
  }
  return `${label}: ${value ? ok : bad}`;
}

/**
 * El informe como texto para la terminal. Lo que se ve es lo que hay que anotar en la bitácora de la
 * prueba (`docs/runbooks/oauth.md`): ningún valor personal, sólo nombres y respuestas de sí o no.
 */
export function formatIdTokenReport(report: IdTokenReport): string {
  if (!report.decodable) {
    return 'El texto no es un ID token (un JWT de tres partes con un payload JSON).';
  }

  const lines = [
    'ID token de Microsoft',
    `  Cuenta: ${report.account}${report.tenantId === null ? '' : ` (tid ${report.tenantId})`}`,
    `  ${matches('Emisor (iss)', report.issuerMatches, 'corresponde', 'NO corresponde')}`,
    `  ${matches('Audiencia (aud)', report.audienceMatches, 'corresponde', 'NO corresponde')}`,
    `  Vencimiento: ${report.expired === null ? 'sin exp' : report.expired ? 'VENCIDO' : 'vigente'}`,
    '',
    `Claims que trae (sólo los nombres): ${report.claimNames.join(', ')}`,
    '',
    'Los que importan para el ingreso:',
    ...Object.entries(report.present).map(([name, present]) => `  ${name}: ${YES_NO(present)}`),
    '',
    report.emailVerified.verified
      ? `La API CREARÍA la cuenta: ${report.emailVerified.because}.`
      : `La API NO crearía la cuenta: ${report.emailVerified.because}.`,
  ];

  return lines.join('\n');
}
