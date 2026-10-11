# 2026-10-11 — Fase 10: F10-11, el servidor estático de la landing

- Autor: Claude Sonnet 5.5 (sesión de OAuth, que tomó la tarea con aviso a la de la landing)
- Duración aprox: una sesión (una tarea de 3 puntos, de riesgo medio)

## Objetivo

F10-11: lo que Railway corre para servir `apps/landing/dist` — un Fastify mínimo con helmet y
`@fastify/static`, una CSP estricta (la landing no tiene JavaScript ni estilos en línea), caché distinta
para lo que lleva hash y lo que no, `/health` y un 404 con la página de la marca.

## Por qué la tomé yo

La sesión "Plan de acción landing page Astro" estaba en F10-08. F10-11 y F10-12 no dependen de las
secciones (sólo de F10-01 y F10-03), así que el usuario me dejó retomarlas. Le avisé a esa sesión antes
de empezar, con los archivos que iba a tocar; confirmó que no los toca. Aviso pendiente: cuando F10-11
esté en `main`, F10-10 la usa para su E2E contra el build servido.

## Qué se hizo

- **`apps/landing/server/app.ts`**: `buildLandingServer({ root })` y `defaultDistDir()`. Helmet con una
  CSP explícita y sin los defaults (`default-src 'self'`, `script-src 'none'`, `style-src 'self'`,
  `img-src 'self'`, `font-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `form-action 'none'`, `upgrade-insecure-requests`), HSTS y `Referrer-Policy` como la API;
  `@fastify/static` con la caché por archivo, `redirect: true` y `dotfiles: 'ignore'`; `/health`; y un
  404 con `404.html` y status 404, sin fallback de SPA.
- **`apps/landing/server/server.ts`**: el proceso. `PORT`, `HOST`, `LANDING_DIST_DIR` y `LOG_LEVEL`, con
  defaults; sin `.env`. Se corre con `node server/server.ts` (Node 24 ejecuta TypeScript sin compilar) o
  `pnpm --filter @wasabi-cross/landing start`.
- **Dependencias**: `@fastify/helmet` y `@fastify/static` pasan al `catalog:` (con `fastify`), y la API
  usa la misma versión.
- **51 pruebas** contra el build real de producción que arma `global-setup.ts`. Incluye una que arranca
  el proceso de verdad con `node` y sin `.env`.
- **Pruebas inversas (20)**: sacar helmet, admitir scripts, `unsafe-inline`, `data:`, conexiones propias,
  sacar `form-action`, `frame-ancestors`, `object-src` o `upgrade-insecure-requests`, un HSTS de un
  segundo, `unsafe-url`, cachear todo un año, no cachear nada, un asset sin `immutable`, servir archivos
  ocultos, no redirigir `/privacidad`, la raíz sin index, un soft 404, `/health` cacheable y arrancar sin
  build; en las 20 falla algún test. Una sobrevivió la primera vez: en `dist/` no hay ningún archivo
  oculto, así que `'ignore'` y `'allow'` se veían iguales; ahora hay un `.env` de verdad en el fixture.

## Decisiones tomadas

- **La CSP sale de la salida real del build**, no de una lista de deseos: el build no tiene `data:`,
  `style=""` ni `<script>`, así que no se admite ninguno. Un test recorre lo que pide el HTML y el CSS y
  falla si algún recurso es de otro origen.
- **Se prueba en un navegador de verdad**, además de `fastify.inject`: `inject` no ve que
  `upgrade-insecure-requests` pueda romper un `http://127.0.0.1`. No lo rompe (cero quejas de CSP).
- **Los defaults de helmet que el criterio no pide quedan**: `Cross-Origin-Resource-Policy` y
  `Cross-Origin-Opener-Policy` en `same-origin`. No los aflojé.

## Bloqueos / lo que no funcionó

- Un test mío tomaba el `<link rel="canonical">` (URL absoluta de SEO) por un recurso que la CSP
  tendría que admitir. No carga nada: lo acoté a los `<link>` que sí cargan.
- El lint daba 2188 errores de "tipo que no se puede resolver": en un worktree nuevo faltaban `schemas` y
  `ui` compilados. `pnpm build` primero, como ya estaba anotado.
- Un heredoc de Python se comió una `\n` dentro de un string (otra vez la barra invertida); lo arreglé con
  la herramienta de edición.

## Próximo paso

F10-12 (Railway: el segundo servicio, como código), que depende de ésta; después, F10-10 de la otra
sesión puede correr su E2E contra este servidor. Avisarle cuando F10-11 esté en `main`.
