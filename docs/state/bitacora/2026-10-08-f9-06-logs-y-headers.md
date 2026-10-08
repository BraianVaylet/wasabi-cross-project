# 2026-10-08 — Fase 9: F9-06, nada del flujo OAuth sale en un log

- Autor: Claude Sonnet 5.5
- Duración aprox: una sesión (una tarea de 2 puntos, de riesgo medio)

## Objetivo

F9-06: que ni el `code` ni el `state` del callback de OAuth, ni el `idToken` ni el `clientSecret`,
puedan quedar en un log; y dejar fijado con tests que el ingreso no toca la CSP, el
`Referrer-Policy` ni la cookie del `state`.

## Qué se hizo

- **`shared/logger.ts`**: `idToken`, `*.idToken`, `clientSecret` y `*.clientSecret` se redactan por
  path. `withoutQuery` corta la URL en el `?` y en el `#`, y dos serializadores la aplican: `req`
  (reemplaza al de Fastify, con los mismos campos) y `url` (para los `{ url: request.url }` que el
  error handler, `auth.routes.ts` y los guards escriben a mano).
- **`auth/infrastructure/auth-logger.ts`**: el `logger` de Better Auth escribe por Pino, con las
  mismas opciones y la marca `component: better-auth`; de los argumentos que recibe sólo salen
  `name`, `code`, `provider` y `providerId`, y sólo si son texto.
- **Costura para los tests**: `buildApp({ logStream })` y `createAuth({ logStream })`; con un stream
  no hay `transport` (Pino no admite los dos).
- **Tests de integración** (en `oauth-signin.test.ts`, contra el IdP falso y un replica set): un
  callback fallido con `code` y `state`, el `warn` de un callback rechazado por el límite, una ruta
  que no se expone, y el recorrido completo (el `code` y el `state` reales, y la cookie de sesión,
  no aparecen en ningún log); la CSP y el `Referrer-Policy` de `/sign-in/social` y del callback son
  los de `/health`; la cookie del `state` es `SameSite=Lax` y `HttpOnly`.
- `docs/architecture.md` suma la regla.
- Pruebas inversas: 20 protecciones rotas a propósito (cada redacción, cada serializador, el corte
  del `?` y del `#`, el logger de Better Auth, los `details`, la CSP, el `Referrer-Policy`, la cookie
  en `Strict` y en `None`); en las 20 falla algún test.

## Decisiones tomadas

- **El query se saca en el logger, no en cada lugar que loguea.** El plan decía "el log de requests y
  el `warn` de `auth.routes.ts`", pero eran siete lugares con `url: request.url`, y el siguiente que
  se agregue habría que acordarse. Un serializador por la clave `url` los cubre a todos.
- **De los errores de Better Auth no se loguea el mensaje.** Alcanzaba con `name` y `code`
  (`state_mismatch`, `unable_to_get_user_info`…) para saber qué pasó, y el mensaje de un error del
  endpoint de tokens puede traer lo que el proveedor devuelva. Si hace falta más para depurar un
  caso real, se agrega un campo a la lista, a propósito.
- **El serializador de `req` tolera lo que no trae** (`Partial`): un serializador que tira rompe el
  log y, con él, la petición.

## Bloqueos / lo que no funcionó

- **Better Auth filtraba el `state` por su cuenta.** Lo vi al escribir el primer test del callback
  fallido, que capturaba `console` además del stream de Pino: Better Auth escribía
  `Failed to parse state {"code":"state_mismatch","details":{"state":"…"}}` a la consola, fuera del
  log estructurado y sin redacción. El plan no lo preveía: pensaba sólo en lo que loguea Fastify.
- **Dos pruebas inversas "sobrevivieron" y no eran tests débiles.** Pasar la cookie a `Strict` y a
  `None` no cambió nada porque el proyecto ya fija `defaultCookieAttributes` en `advanced`, y mi
  mutación agregaba un segundo `advanced` que el original pisaba; muté el valor real y se detectó.
  La tercera, `details` en la lista de campos, no cambiaba nada porque el filtro de "sólo texto" ya
  lo tiraba (en Better Auth es un objeto): faltaba un test con `details`, `message` y `stack` de
  texto.
- Pino real no lee `stream` de las opciones (Fastify sí): va como segundo argumento.

## Próximo paso

Debe coincidir con el punto 10 de "Próximo paso" en [STATE.md](../STATE.md): revisión humana de los
tests de F9-05 y de esta PR; después F9-07 (la pantalla de ingreso, con la que vuelve a andar
`/login`). Faltan las tarjetas de la Fase 9 (`/trello-sync`).
