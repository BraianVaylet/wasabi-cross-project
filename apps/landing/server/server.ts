import { buildLandingServer, defaultDistDir } from './app.ts';

/*
 * El proceso de la landing en producción (F10-11): `node apps/landing/server/server.ts`, o
 * `pnpm --filter @wasabi-cross/landing start`. Sin `.env` y sin variables obligatorias:
 *
 *   PORT             el puerto (3000). Railway lo pone.
 *   HOST             dónde escucha (127.0.0.1). En Railway va en 0.0.0.0.
 *   LANDING_DIST_DIR el build (`apps/landing/dist`).
 *   LOG_LEVEL        el nivel de log (info).
 *
 * El contenido —la URL de la app, el sitio, si se indexa— no se lee acá: lo inlinea Astro al
 * compilar (F10-12).
 */

function port(raw: string | undefined): number {
  const value = Number(raw ?? '3000');
  if (!Number.isInteger(value) || value < 0 || value > 65_535) {
    throw new Error(`PORT inválido: ${String(raw)}`);
  }
  return value;
}

const app = await buildLandingServer({
  root: process.env.LANDING_DIST_DIR ?? defaultDistDir(),
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'landing' },
    timestamp: () => `,"ts":"${new Date().toISOString()}"`,
  },
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'Apagando');
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port: port(process.env.PORT), host: process.env.HOST ?? '127.0.0.1' });
