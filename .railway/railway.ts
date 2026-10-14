import { defineRailway, github, preserve, project, service } from 'railway/iac';

/*
 * Wasabi Cross en Railway (F3-04, F10-12, spec §12), como código: lo que el deploy hace no se
 * clickea en un panel.
 *
 * Dos servicios del mismo repo:
 *
 *   - `wasabi-cross`: la API, que sirve también el front compilado en el mismo origen (ADR-0007).
 *     La base es Mongo Atlas (F3-08), no una de Railway.
 *   - `wasabi-cross-landing`: la landing, un sitio estático aparte con su propio servidor (ADR-0013,
 *     F10-11). Sin base de datos, sin cookies y sin ningún secreto.
 *
 * Los secretos van con `preserve()`: se cargan en Railway y nunca en este archivo. Plan y
 * apply los corre el usuario con `railway config plan` / `apply` (ver README.md): tocar el
 * proyecto de Railway es 🔑 en el plan de acción.
 */

/** La rama que se deploya. staging sigue a `main`; prod también, pero sólo a mano (F3-09). */
const REPO = 'BraianVaylet/wasabi-cross-project';

/*
 * Qué cambios disparan un deploy de cada servicio. Sin esto, con dos servicios del mismo repo un
 * push redeploya los dos: un cambio de copy reiniciaría la API (ADR-0013). Son patrones relativos a
 * la raíz del repo. `packages/**` es de los dos (los tokens de `ui` y las reglas de `schemas` los
 * usan la app y la landing), y los archivos de la raíz definen qué dependencias se instalan.
 */
const COMPARTIDO = [
  'packages/**',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'package.json',
  '.railway/**',
];

const WATCH_APP = ['apps/api/**', 'apps/web/**', ...COMPARTIDO];
const WATCH_LANDING = ['apps/landing/**', ...COMPARTIDO];

export default defineRailway((ctx) => {
  const prod = ctx.environment === 'production';

  const app = service('wasabi-cross', {
    source: github(REPO, { branch: 'main' }),

    build: {
      // La API y el front, con sus dependencias (`...`: schemas y ui, en orden). No la landing: ya
      // no es `pnpm build`, que con la landing sumaría su build y sus dependencias al deploy de la API.
      buildCommand: 'pnpm --filter @wasabi-cross/api... --filter @wasabi-cross/web... build',
      watchPatterns: WATCH_APP,
    },
    // Compilado y sin `tsx`: en producción no corre nada de desarrollo.
    start: 'node apps/api/dist/server.js',
    // Las migraciones van antes de mover el tráfico (ADR-0005), y después el catálogo (F3-13): sin
    // el seed un ambiente nuevo arranca con "Nuevo ejercicio" vacío. En ese orden porque el seed se
    // niega a correr con migraciones pendientes. Si cualquiera falla, Railway corta el deploy y la
    // versión anterior sigue atendiendo. El seed es idempotente: un deploy sin cambios no escribe.
    preDeploy: [
      'pnpm --filter @wasabi-cross/api migrate:dist up',
      'pnpm --filter @wasabi-cross/api seed:dist',
    ],
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

      // El ingreso (F9-10, spec §5.6): un cliente OAuth por ambiente, y cada par va completo o no va.
      // Sin ninguno la API no arranca. El runbook (`docs/runbooks/oauth.md`) dice cómo se crean y
      // cuándo vence el de Microsoft. **Nunca** `OAUTH_DEV_IDP`: la API se niega a arrancar con él en
      // producción, y acá ni se lo declara.
      GOOGLE_CLIENT_ID: preserve(),
      GOOGLE_CLIENT_SECRET: preserve(),
      MICROSOFT_CLIENT_ID: preserve(),
      MICROSOFT_CLIENT_SECRET: preserve(),
    },
  });

  const landing = service('wasabi-cross-landing', {
    source: github(REPO, { branch: 'main' }),

    build: {
      // La landing y lo que usa (`@wasabi-cross/ui` por los tokens y `@wasabi-cross/schemas` por las
      // reglas), no la API ni el front.
      buildCommand: 'pnpm --filter @wasabi-cross/landing... build',
      watchPatterns: WATCH_LANDING,
    },
    // TypeScript sin compilar: Node 24 lo ejecuta tal cual (F10-11). Desde la raíz del repo.
    start: 'node apps/landing/server/server.ts',
    // Un sitio estático no tiene de qué depender: no hay base, ni migraciones.
    healthcheck: '/health',
    healthcheckTimeout: 60,

    env: {
      // Sin `NODE_ENV`, a propósito: con `production` el instalador de dependencias omitiría las de
      // desarrollo, y `astro` —que compila el sitio— es una de ellas. El servidor no lo necesita.
      HOST: '0.0.0.0',
      LOG_LEVEL: 'info',

      // **Variables de build**: Astro las inlinea al compilar (spec §5.7), así que tienen que estar
      // cuando se construye. Son públicas: ninguna lleva un secreto. Las dos URLs dependen del
      // dominio, que todavía no está decidido (F10-13): se cargan en Railway, y sin ellas el sitio
      // sale sin "Entrar" y sin URLs absolutas.
      PUBLIC_SITE_URL: preserve(),
      PUBLIC_APP_URL: preserve(),
      // Quién responde en /privacidad/ y /terminos/ (spec §5.7, F10-09). Van las dos o ninguna, y con
      // `LANDING_INDEXABLE=1` sin ellas el build falla a propósito. Son datos de una persona: nunca
      // escritos en el repo, las carga quien despliega (F10-13).
      PUBLIC_CONTACT_NAME: preserve(),
      PUBLIC_CONTACT_EMAIL: preserve(),
      // Sólo production se indexa: con `1` y sin `PUBLIC_SITE_URL` el build falla a propósito, en
      // vez de publicar una página sin `canonical`.
      LANDING_INDEXABLE: prod ? '1' : '0',
    },
  });

  return project('wasabi-cross', { resources: [app, landing] });
});
