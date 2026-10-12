import { photoSourceOf, sniffPhotoType, type PhotoMiss, type PhotoType } from '../domain/photo.ts';

/** Lo que la API le sirve al front: los bytes y el tipo que dicen ellos mismos, no el que se declaró. */
export interface Photo {
  type: PhotoType;
  bytes: Uint8Array;
}

export type PhotoResult = { found: true; photo: Photo } | { found: false; reason: PhotoMiss };

/**
 * Cómo se baja una foto de Google. Un puerto: el módulo no sabe de `fetch`, del tiempo máximo ni de
 * cuántos bytes acepta; eso es del que lo implementa (`download-photo.ts`). Nunca lo llama con otra
 * cosa que una URL que `photoSourceOf` ya aprobó.
 */
export type PhotoDownloader = (
  url: URL,
) => Promise<{ bytes: Uint8Array } | { failure: 'muy_grande' | 'proveedor_no_responde' }>;

/**
 * La foto de un usuario, a partir del `user.image` que guarda Better Auth (F9-08, spec §5.6).
 *
 * Todo lo que no se puede servir es "sin foto" con su motivo, no una excepción: al usuario le da lo
 * mismo (un 404 y las iniciales), y al log le sirve saber cuál fue. Lo último que se mira son los
 * bytes: un host permitido o un tipo declarado no alcanzan si lo que llegó no es una imagen.
 */
export async function getPhoto(
  { download }: { download: PhotoDownloader },
  image: string,
): Promise<PhotoResult> {
  const source = photoSourceOf(image);

  if (source.kind === 'rejected') {
    return { found: false, reason: source.reason };
  }

  let bytes: Uint8Array;
  if (source.kind === 'inline') {
    bytes = source.bytes;
  } else {
    const downloaded = await download(source.url);
    if ('failure' in downloaded) {
      return { found: false, reason: downloaded.failure };
    }
    bytes = downloaded.bytes;
  }

  const type = sniffPhotoType(bytes);
  return type === null
    ? { found: false, reason: 'no_es_una_imagen' }
    : { found: true, photo: { type, bytes } };
}
