/**
 * Las navegaciones que el service worker NO contesta con `index.html` (F9-05, ADR-0012).
 *
 * El callback de OAuth es una navegación: el proveedor redirige al navegador a
 * `/api/auth/callback/<id>`, y esa respuesta —un redirect que abre la sesión con una cookie— tiene
 * que salir de la API. Con la PWA activa, Workbox la contestaba con el shell de la app y el ingreso
 * nunca se completaba. Lo mismo vale para la documentación de la API (`/docs`), que también sirve
 * la API.
 *
 * Workbox compara cada regla contra `pathname + search`. Las rutas del front no empiezan con
 * `/api` ni con `/docs`: el `/` o el fin del texto después del nombre evita que un `/apuntes` o un
 * `/docs-de-entrenamiento` futuros queden afuera por error.
 */
export const NAVIGATE_FALLBACK_DENYLIST: RegExp[] = [/^\/api\//, /^\/docs(\/|$)/];
