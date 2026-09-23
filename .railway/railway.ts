import { defineRailway, github, preserve, project, service } from 'railway/iac';

/*
 * Wasabi Cross en Railway (F3-04, spec §12), como código: lo que el deploy hace no se
 * clickea en un panel.
 *
 * Un solo servicio: la API sirve también el front compilado, en el mismo origen
 * (ADR-0007). La base es Mongo Atlas (F3-08), no una de Railway.
 *
 * Los secretos van con `preserve()`: se cargan en Railway y nunca en este archivo. Plan y
 * apply los corre el usuario con `railway config plan` / `apply` (ver README.md): tocar el
 * proyecto de Railway es 🔑 en el plan de acción.
 */

/** La rama que se deploya. staging sigue a `main`; prod también, pero sólo a mano (F3-09). */
const REPO = 'BraianVaylet/wasabi-cross-project';

export default defineRailway((ctx) => {
  const prod = ctx.environment === 'production';

  const app = service('wasabi-cross', {
    source: github(REPO, { branch: 'main' }),

    // Los cuatro workspaces, en orden: schemas y ui antes que la API y el front.
    build: 'pnpm build',
    // Compilado y sin `tsx`: en producción no corre nada de desarrollo.
    start: 'node apps/api/dist/server.js',
    // Las migraciones van antes de mover el tráfico (ADR-0005). Si fallan, Railway corta el
    // deploy y la versión anterior sigue atendiendo.
    preDeploy: 'pnpm --filter @wasabi-cross/api migrate:dist up',
    // `/ready` y no `/health`: con migraciones pendientes o sin Mongo, la instancia nueva no
    // tiene que recibir tráfico aunque el proceso esté vivo.
    healthcheck: '/ready',
    healthcheckTimeout: 60,

    env: {
      NODE_ENV: 'production',
      // En un contenedor hay que escuchar en todas las interfaces; el default de la API
      // (127.0.0.1) sólo sirve en desarrollo. El puerto lo pone Railway en PORT.
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',
      // El front compilado, relativo a la raíz del repo, que es donde arranca el proceso.
      WEB_DIST_DIR: 'apps/web/dist',
      // Una base por ambiente: staging tiene datos sintéticos, nunca una copia de prod.
      MONGODB_DB_NAME: prod ? 'wasabi_cross' : 'wasabi_cross_staging',

      // Secretos y URLs de cada ambiente: viven en Railway (F3-07, F3-11).
      MONGODB_URI: preserve(),
      BETTER_AUTH_SECRET: preserve(),
      // La URL pública del ambiente. Front y API comparten origen, así que son la misma.
      WEB_ORIGIN: preserve(),
      BETTER_AUTH_URL: preserve(),
    },
  });

  return project('wasabi-cross', { resources: [app] });
});
