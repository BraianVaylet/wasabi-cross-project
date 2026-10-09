# 2026-10-09 — Fase 9: F9-08, la foto del usuario en el Perfil

- Autor: Claude Sonnet 5.5
- Duración aprox: una sesión larga (una tarea de 5 puntos, de riesgo medio: la API baja una URL)

## Objetivo

F9-08: que el Perfil muestre la foto del usuario (o sus iniciales), nombre y email. La foto la guarda
Better Auth en `user.image` —un data URL de Microsoft o una URL de Google— y la API tiene que servirla
desde su propio origen, sin ensanchar la CSP y sin que `/me` cargue con ella.

## Qué se hizo

- **`GET /api/v1/me/photo`** (módulo `users`). `domain/photo.ts` decide de dónde sale la foto: un data URL se
  decodifica; una URL se baja **sólo** si es `https` de `*.googleusercontent.com` (sin credenciales ni puerto
  raro), y cualquier otro host no se baja nunca. Sólo `png`, `jpeg` y `webp`, y el tipo es el que dicen los
  bytes. `infrastructure/download-photo.ts` baja con tiempo máximo para toda la descarga, tamaño máximo (mirando
  el `content-length` y contando lo que llega) y sin seguir redirecciones. `ETag` con el hash del valor de
  `user.image`: con `If-None-Match` igual, 304 antes de bajar nada.
- **`/me`** suma `hasPhoto`, y nunca la URL ni el data URL. `AuthenticatedUser` gana `image`.
- **`Avatar`** en `@wasabi-cross/ui` (foto o iniciales, cuadrado, decorativo, cae a las iniciales si la foto
  falla) y, en el Perfil, un bloque "Tu cuenta" con avatar, nombre y email. `HttpClient.url()` y
  `createApp({ photoUrl })` le dan al `<img>` la URL completa cuando la API está en otro origen.
- `WC-USER-404-001` en el catálogo y el diccionario; la regla en `docs/architecture.md`.
- Tests: la API pasó de 724 a 861 (el dominio, la aplicación, la descarga contra un servidor de verdad en
  `127.0.0.1` y la ruta completa contra Mongo con el `fetch` del proveedor inyectado), la UI de 159 a 179 y la
  web de 443 a 454.
- Pruebas inversas: 42 protecciones rotas a propósito (cada condición del host, del tipo, del tamaño, de las
  redirecciones, del ETag, de los headers, de `hasPhoto`, del Avatar…); en las 42 falla algún test.

## Decisiones tomadas

- **Un solo host, no una lista configurable.** Hoy hay un proveedor que sirve fotos por URL. Una variable de
  entorno con hosts permitidos sería una forma de que un error de configuración abra el SSRF.
- **El tipo sale de los bytes.** Un data URL o un `Content-Type` ajeno pueden decir cualquier cosa; lo que
  cuenta es qué son las primeras posiciones del archivo.
- **El ETag es del valor de `user.image`, no de los bytes**, para revalidar sin volver a pedirle nada a Google.
  Si el proveedor cambia la foto, cambia la URL.
- **Un 404 lleva `no-store` y nunca `ETag`.** Un error guardado taparía la foto cuando el proveedor vuelva.

## Bloqueos / lo que no funcionó

- **`main` estaba en rojo cuando arranqué, y no por esta tarea.** Los tres jobs del CI fallaban en "Instalar
  dependencias": `pnpm-lock.yaml` tenía `source-map-js@1.2.2` duplicado (en `packages` y en `snapshots`, por mi
  fix de la #103 más el regenerado de dependabot) y `vite-plugin-pwa` en `^1.3.0` contra `^2.0.0` en el
  manifiesto (la #109 se mergeó sin regenerar). Lo arreglé aparte, en la
  [PR #112](https://github.com/BraianVaylet/wasabi-cross-project/pull/112), con la verificación completa
  (incluido el E2E de producción, que ejercita el service worker con `vite-plugin-pwa` 2).
- **Un `node_modules` a medias miente.** En este worktree, `pnpm install` decía "Already up to date" y el
  typecheck de la API fallaba por dos copias de pino (`10.3.1` vieja y `10.4.0`), con `fastify` enlazado a la
  vieja; en el worktree del fix, recién instalado, compilaba. Se arregló borrando los `node_modules` del
  worktree y reinstalando. Si una dependencia cambia de versión y los tipos se contradicen, desconfiar del
  `node_modules` antes que del código.
- **Corridas de E2E que se pisan.** Un comando en segundo plano con un `&` de más siguió vivo y levantó
  servidores que la corrida siguiente encontró ocupados ("Port 5174 is already in use"). Hubo que parar
  los procesos huérfanos y repetir. Una sola corrida a la vez por puerto.
- **Tres pruebas inversas "sobrevivieron" y ninguna era la que parecía.** Una era un caso que de verdad faltaba
  (un JPEG sin su tercer byte). Otra sí se detectaba, pero el test fallaba imprimiendo un diff de 512 KB y el
  script se quedaba sin buffer: ahora los tests comparan el motivo y no el objeto con los bytes, y el script
  tiene más `maxBuffer`. La tercera era un mutante que no compilaba (`failed` quedaba sin usar), así que nunca
  llegó a los tests.
- Un test de la redirección no distinguía seguirla de no seguirla: apuntaba a un puerto cerrado, que falla igual.
  Ahora apunta a otra ruta del mismo servidor y se cuenta que no hay un segundo pedido.

## Próximo paso

Debe coincidir con el punto 10 de "Próximo paso" en [STATE.md](../STATE.md): revisión humana de esta PR —sobre
todo `domain/photo.ts` y `download-photo.ts`, que son lo que decide qué baja la API— y mergear la #112; después
F9-09 (el E2E del ingreso, con foto y axe a 390px). Faltan las tarjetas de la Fase 9 (`/trello-sync`).
