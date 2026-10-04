# 2026-10-04 — Fase 9: F9-01 y F9-02, los contratos y el módulo `oauth`

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta (dos tareas de 2 y 3 puntos)

## Objetivo

Empezar el código de la Fase 9, una vez mergeados el plan (PR #94) y la Fase 8 (PR #93): F9-01
(contratos de OAuth en `@wasabi-cross/schemas`) y F9-02 (el módulo `oauth` de la API con su
configuración y la lista de proveedores). Las dos dependen sólo de F9-00, así que van en la misma
rama, un commit por tarea. No cambia cómo se entra: el formulario de contraseña sigue hasta F9-05.

## Qué se hizo

- **F9-01** · `oauth.api.ts` en schemas: `oauthProviderSchema` (`google`, `microsoft` y `fake-idp`),
  la respuesta estricta de `GET /oauth/providers` y `oauthErrorFor`, que traduce el `?error=` del
  callback. Los tres códigos `WC-OAUTH-*` en el catálogo y en `docs/error-codes.md`.
- **F9-02** · `modules/oauth/{domain,application,infrastructure}`, `GET /api/v1/oauth/providers` sin
  sesión y su cableado (`composeOauth`, `app.ts`, `server.ts`, el harness de tests). `parseEnv` pasa
  a un `superRefine` con los pares de credenciales (completos o ausentes), `OAUTH_DEV_IDP` y
  `MICROSOFT_AUTHORITY`, y una variable vacía vale como ausente.
- TDD en las dos: el test primero, rojo, y después el código. Con la API real (`dev:ephemeral` en
  otros puertos) la lista responde `fake-idp` con `OAUTH_DEV_IDP=on` y `/me` sigue dando 401.

## Decisiones tomadas

- **`fake-idp` entra al enum de proveedores** de schemas. F9-02 lo lista con `OAUTH_DEV_IDP=on` y el
  front tiene que poder tipar esa respuesta; la API no lo lista nunca con `NODE_ENV=production`
  (`parseEnv` no deja prenderlo).
- **"La API no arranca sin ningún proveedor" pasa de F9-02 a F9-05.** Exigirlo ahora habría roto
  `pnpm dev`, `dev:ephemeral` y el E2E del CI, que siguen entrando por el formulario. Y va en
  `server.ts`, no en `parseEnv`: `migrate` y `seed` leen el mismo entorno y no necesitan ningún
  proveedor. El plan quedó corregido en las dos tareas.
- **`oauthErrorFor` recibe un `unknown`** y sólo `access_denied` y `account_not_linked` tienen código
  propio. El resto, incluido `email_not_verified` (que Better Auth sí manda), es el genérico: el
  parámetro lo puede armar cualquiera con un link.
- **La frontera entre módulos no tiene test propio.** La regla de ESLint ya cubre
  `modules/*/domain` y `modules/*/application`; se comprobó a mano, en las dos direcciones, que un
  import cruzado hace fallar `pnpm lint`.

## Bloqueos / lo que no funcionó

- `pnpm verify` y `pnpm test:coverage` fallan por **tests de `apps/web` que se pasan de 5000 ms**
  cuando corren todos los workspaces juntos: 19 en una corrida y 14 en otra, cada vez otros (los de
  axe y los formularios, `auth.test.tsx` incluido). Solos pasan 392 de 392, con y sin coverage, y
  nada de esto toca la web. Con lint, typecheck, build, schemas (313), ui (148) y la API (447, 93 %
  de ramas) en verde, la corrida en el CI dirá si pasa con menos carga. Queda en STATE.
- Aparecieron PNG sin seguimiento en `docs/landing/capturas/` que no son de esta sesión (otra
  sesión o proceso); no se tocaron ni se subieron.

## Próximo paso

Revisar la PR; después F9-03 (el IdP falso, de riesgo alto). Debe coincidir con el punto 10 de
"Próximo paso" en [STATE.md](../STATE.md). Faltan las tarjetas de la Fase 9 (`/trello-sync`).
