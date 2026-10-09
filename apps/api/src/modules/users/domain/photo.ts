import { createHash } from 'node:crypto';

/*
 * La foto del usuario (F9-08, spec §5.6, ADR-0012). Better Auth guarda en `user.image` lo que el
 * proveedor le dio: un data URL (Microsoft) o una URL de `googleusercontent.com` (Google). La API la
 * sirve desde su propio origen, así la CSP no se toca y `/me` no carga con 6 KB de foto.
 *
 * Dos cosas pueden salir mal y las dos son de seguridad. Si la API baja una URL, el host no puede
 * salir de lo que diga un usuario (SSRF): sólo hay uno permitido. Y si sirve una imagen, el tipo no
 * puede ser uno que ejecute algo (un SVG sirve script en el origen de la app): sólo PNG, JPEG y WebP,
 * y por lo que los bytes dicen ser, no por lo que diga quien los mandó.
 */

/** Más que de sobra para una miniatura de 96 px (pesan 5 a 10 KB), y lo que se corta por encima. */
export const PHOTO_MAX_BYTES = 512 * 1024;

export type PhotoType = 'image/png' | 'image/jpeg' | 'image/webp';

const ALLOWED_TYPES: ReadonlySet<string> = new Set<PhotoType>([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/** Por qué no hay foto que mostrar. Va al log; a la persona, el mismo `WC-USER-404-001` para todos. */
export type PhotoMiss =
  | 'sin_foto'
  | 'origen_no_permitido'
  | 'tipo_no_permitido'
  | 'muy_grande'
  | 'no_es_una_imagen'
  | 'proveedor_no_responde';

export type PhotoSource =
  | { kind: 'inline'; bytes: Uint8Array }
  | { kind: 'remote'; url: URL }
  | { kind: 'rejected'; reason: PhotoMiss };

/**
 * `*.googleusercontent.com` y nada más: sin subdominio no (`googleusercontent.com` pelado no sirve
 * fotos), sin `http`, sin credenciales ni puerto raro. La comparación es contra el `hostname` que
 * ya normalizó `URL`, no contra el texto: `lh3.googleusercontent.com@evil.example` es de `evil.example`.
 */
const GOOGLE_PHOTO_HOST = /^(?:[a-z0-9-]+\.)+googleusercontent\.com$/;

export function isGoogleUserContentUrl(url: URL): boolean {
  return (
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    // `URL` deja el puerto vacío cuando es el de siempre (443).
    url.port === '' &&
    GOOGLE_PHOTO_HOST.test(url.hostname)
  );
}

/**
 * Lo que dicen ser los bytes, por sus primeras posiciones (PNG, JPEG, WebP). Es la verdad sobre la
 * imagen: el tipo que declare un data URL o un `Content-Type` ajeno no cuenta.
 */
export function sniffPhotoType(bytes: Uint8Array): PhotoType | null {
  const at = (index: number): number => bytes[index] ?? -1;
  const startsWith = (signature: readonly number[], offset = 0): boolean =>
    signature.every((byte, index) => at(offset + index) === byte);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (startsWith([0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  // WebP es un RIFF cuyo tipo, en los bytes 8 a 11, es "WEBP": un WAV también empieza con RIFF.
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

/**
 * `data:<tipo>;base64,<datos>`. Better Auth arma el de Microsoft con un espacio después de la coma,
 * y el base64 puede venir cortado en líneas: se tolera el espacio en blanco.
 */
const DATA_URL = /^data:([a-z0-9.+/-]*);base64,([A-Za-z0-9+/=\s]*)$/i;

/** El largo en base64 de `PHOTO_MAX_BYTES` bytes: por encima, ni se intenta decodificar. */
const MAX_BASE64_LENGTH = Math.ceil(PHOTO_MAX_BYTES / 3) * 4;

function inlineSource(image: string): PhotoSource {
  const match = DATA_URL.exec(image);
  const declared = match?.[1]?.toLowerCase();

  if (match === null || declared === undefined || !ALLOWED_TYPES.has(declared)) {
    return { kind: 'rejected', reason: 'tipo_no_permitido' };
  }

  const base64 = (match[2] ?? '').replace(/\s+/g, '');
  if (base64.length > MAX_BASE64_LENGTH) {
    return { kind: 'rejected', reason: 'muy_grande' };
  }

  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  if (bytes.length === 0) {
    return { kind: 'rejected', reason: 'no_es_una_imagen' };
  }
  if (bytes.length > PHOTO_MAX_BYTES) {
    return { kind: 'rejected', reason: 'muy_grande' };
  }
  return { kind: 'inline', bytes };
}

/** De dónde sale la foto: los bytes que ya están, una URL de Google para bajar, o nada. */
export function photoSourceOf(image: string): PhotoSource {
  const value = image.trim();

  if (value === '') {
    return { kind: 'rejected', reason: 'sin_foto' };
  }
  if (/^data:/i.test(value)) {
    return inlineSource(value);
  }

  try {
    const url = new URL(value);
    return isGoogleUserContentUrl(url)
      ? { kind: 'remote', url }
      : { kind: 'rejected', reason: 'origen_no_permitido' };
  } catch {
    // No es una URL absoluta (una ruta, un nombre de archivo): no hay a dónde ir a buscarla.
    return { kind: 'rejected', reason: 'origen_no_permitido' };
  }
}

/**
 * El ETag es el hash del valor de `user.image`, no de los bytes: así revalidar no obliga a bajar la
 * foto de Google otra vez. Si el proveedor cambia la foto, cambia la URL, y con ella el ETag. Va
 * entre comillas (es un ETag fuerte) y no deja ver el valor, que es un dato personal.
 */
export function photoEtag(image: string): string {
  return `"${createHash('sha256').update(image).digest('hex').slice(0, 32)}"`;
}

/** Si el `If-None-Match` del pedido incluye este ETag (o es `*`): se contesta 304. */
export function etagMatches(header: string | undefined, etag: string): boolean {
  if (header === undefined) {
    return false;
  }
  return header.split(',').some((candidate) => {
    const value = candidate.trim().replace(/^W\//, '');
    return value === '*' || value === etag;
  });
}
