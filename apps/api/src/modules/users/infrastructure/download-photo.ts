import { PHOTO_MAX_BYTES } from '../domain/photo.ts';
import type { PhotoDownloader } from '../application/get-photo.ts';

export interface PhotoDownloaderOptions {
  /** Inyectable para los tests; el de verdad es el `fetch` global de Node. */
  fetch?: typeof fetch;
  /** Para toda la descarga —los headers y el cuerpo—, no sólo para empezar. */
  timeoutMs?: number;
  maxBytes?: number;
}

type Download = Awaited<ReturnType<PhotoDownloader>>;

/** Lee el cuerpo hasta `maxBytes`: al pasarse, corta la conexión en vez de seguir bajando. */
async function readCapped(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<Download> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { failure: 'muy_grande' };
    }
    chunks.push(value);
  }

  return { bytes: new Uint8Array(Buffer.concat(chunks)) };
}

/**
 * Baja la foto de Google (F9-08). Sólo la llama `getPhoto`, con una URL que ya pasó por
 * `isGoogleUserContentUrl`; acá se acota lo que puede salir mal con un servidor ajeno:
 *
 * - **Tiempo**: `timeoutMs` para toda la descarga. Una foto que no llega no cuelga el Perfil.
 * - **Tamaño**: `maxBytes`, mirando el `content-length` y, por si miente o no viene, contando lo que
 *   llega. Una respuesta más grande se corta.
 * - **Redirecciones**: ninguna. Seguir una sacaría el pedido del host que se aprobó.
 *
 * No manda cookies ni credenciales: es un pedido anónimo a un CDN. Cualquier falla —la red, un 4xx,
 * un 5xx, el tiempo— es lo mismo para quien llama: el proveedor no respondió. El motivo va al log,
 * pero nunca la URL, que es un dato personal.
 */
export function createPhotoDownloader({
  fetch: fetchImpl = (...args) => globalThis.fetch(...args),
  timeoutMs = 3000,
  maxBytes = PHOTO_MAX_BYTES,
}: PhotoDownloaderOptions = {}): PhotoDownloader {
  return async (url) => {
    try {
      const response = await fetchImpl(url, {
        redirect: 'error',
        credentials: 'omit',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'image/png, image/jpeg, image/webp' },
      });

      if (!response.ok || response.body === null) {
        return { failure: 'proveedor_no_responde' };
      }

      const declared = Number(response.headers.get('content-length'));
      if (declared > maxBytes) {
        await response.body.cancel();
        return { failure: 'muy_grande' };
      }

      return await readCapped(response.body, maxBytes);
    } catch {
      return { failure: 'proveedor_no_responde' };
    }
  };
}
