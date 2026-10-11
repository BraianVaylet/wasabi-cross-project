# 2026-10-11 — Fase 10: F10-12, Railway con la landing como segundo servicio

- Autor: Claude Sonnet 5.5 (sesión de OAuth, que tomó F10-11 y F10-12 con aviso a la de la landing)
- Duración aprox: media sesión (una tarea de 2 puntos, de riesgo medio: cambia el build del servicio que ya existe)

## Objetivo

F10-12: que `.railway/railway.ts` declare el servicio de la landing (`wasabi-cross-landing`) junto al de la
app, que cada uno compile sólo lo suyo, y averiguar si los _watch paths_ se pueden declarar en el IaC.

## Qué se hizo

- **`.railway/railway.ts`**: dos servicios. La landing: `build` con `--filter @wasabi-cross/landing...`,
  `start: node apps/landing/server/server.ts`, salud en `/health`, `HOST=0.0.0.0`, y las variables
  `PUBLIC_SITE_URL` y `PUBLIC_APP_URL` (`preserve()`) y `LANDING_INDEXABLE` (`1` sólo en production). La app
  pasa de `pnpm build` a `--filter @wasabi-cross/api... --filter @wasabi-cross/web...`.
- **Watch paths** en `build.watchPatterns` de cada servicio, para que un cambio de copy no reinicie la API
  y uno de la API no redeploye la landing.
- **El test de invariantes** (`railway-config.test.ts`) pasó a dos servicios: 12 → 43 pruebas, ninguna
  borrada, con las invariantes nuevas (builds que no se cruzan, watch paths, la landing sin secretos, el
  archivo de arranque que existe).
- **Las credenciales de OAuth** (`GOOGLE_*` y `MICROSOFT_*`) en el servicio de la app como `preserve()`, que
  F9-10 había dejado sin declarar; y un test de que `OAUTH_DEV_IDP` no esté.
- `.railway/README.md` y ADR-0013 con el resultado de la comprobación de los watch paths.
- **Pruebas inversas**: 14 mutaciones de `railway.ts` (la app vuelve a `pnpm build`, la landing compila la
  API, watch paths cruzados, `.railway/**` fuera de lo compartido, staging indexable, `NODE_ENV` en la
  landing, una credencial de OAuth escrita en el repo, `OAUTH_DEV_IDP` declarado, `/ready` en la landing,
  un `start` a un archivo inexistente, sin `HOST`, `PUBLIC_SITE_URL` literal, `preDeploy` en la landing).
  Murieron las 14; el archivo quedó restaurado byte a byte.

## Decisiones tomadas

- **Los watch paths van en el IaC, no en el panel.** La referencia de `service()` no los documenta, pero el
  tipo `BuildConfig` de `railway/iac` tiene `watchPatterns`, y el test los fija.
- **La landing no declara `NODE_ENV`.** Con `production` el instalador omitiría las dependencias de
  desarrollo y `astro` es una. El servidor no lo necesita.
- **Las URLs públicas son `preserve()`**, porque dependen del dominio. Sin ellas el sitio sale sin "Entrar".

## Bloqueos / lo que no se pudo comprobar

- **`railway config plan` necesita login** (es del usuario, 🔑). El paquete trae `validateGraph`, pero pide
  el grafo ya compilado por la CLI, que no se expone: no se pudo validar el grafo con el validador de
  Railway. Lo que se prueba es la intención (los valores de cada servicio).
- **No se sabe si el servicio respeta los watch paths al deployar**, ni si el instalador de Railway se
  comporta como se supone con `NODE_ENV`. No hay ambientes (F3-07). F10-13 lo mira con un cambio real.
- Un script de validación que corrí desde fuera del repo no resolvía el paquete `railway`: tuve que ponerlo
  adentro del workspace y borrarlo después.

## Próximo paso

F10-11 (#122) ya está en `main`; la PR de esta tarea va contra `main`. Antes de mergearla, mirar que el
build de la landing y el de la app salgan bien en el CI. Después F10-13 (dominio, ambientes y smoke),
que necesita al usuario.
