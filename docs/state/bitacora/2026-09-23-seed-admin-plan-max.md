# 2026-09-23 — Usuario admin fijo con plan Max para desarrollo

- Autor: Claude Sonnet 5 (agente)
- Duración aprox: corta

## Objetivo

El usuario pidió un usuario con plan Max para poder probar sin el límite del plan Free. No hay
proveedor de pago elegido todavía (spec, decisiones abiertas), así que no hay upgrade real
posible — y el usuario aclaró que quiere un usuario **fijo, de desarrollo**, el que va a usar él
mismo de ahora en más.

## Qué se hizo

- `seedAdmin` (`apps/api/src/modules/auth/application/seed-admin.ts`): crea (si no existe, por
  Better Auth — mismo camino que un registro real, no un insert directo) un usuario con
  email/contraseña fijos y le asegura `plan: 'max'` directo en Mongo. Idempotente.
- `pnpm --filter @wasabi-cross/api seed:admin`: lo corre a mano, las veces que haga falta.
- `dev:ephemeral` lo siembra de nuevo en cada arranque: ahí los datos no sobreviven un reinicio,
  así que sin esto el admin desaparecía al cerrar.
- Guard explícito: el script se niega a correr con `NODE_ENV=production` — no hay `.env` en
  producción, así que en la práctica no se puede invocar ahí, pero es la segunda red.
- Test de integración (`seed-admin.test.ts`): crea el usuario, confirma que puede entrar por HTTP
  de verdad (contraseña con el mismo hash que cualquier registro), que correrlo dos veces no
  duplica ni falla, y que si el usuario ya existía con plan Free, lo sube a Max sin re-registrarlo.
- Probado a mano con `dev:ephemeral`: login real por HTTP, `/api/v1/me` confirma `plan: "max"`.

## Decisiones tomadas

- **Credenciales fijas, no generadas al azar**: el usuario dijo "fijo", y es el que va a usar él
  mismo — una contraseña al azar por corrida no serviría. Configurables por env var
  (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`/`SEED_ADMIN_NAME`) si alguna vez hace falta otra.
- **Por Better Auth (`auth.api.signUpEmail`), no un insert directo en Mongo**: así la contraseña
  queda hasheada igual que cualquier otro usuario, y el usuario admin no es un caso especial para
  el resto del sistema — sólo su `plan` lo es.
- **Vive en `modules/auth/application`, no en `scripts`**: mismo patrón que `seedCatalog`, para
  que tanto el CLI (`src/scripts/seed-admin.ts`) como `scripts/ephemeral.ts` lo importen sin
  duplicar lógica ni disparar un `main()` al importarlo.

## Bloqueos / lo que no funcionó

Nada.

## Próximo paso

Sigue igual: **F3-07 a F3-12** en cadena, bloqueadas hasta que el usuario cree los ambientes de
Railway (F3-07) y el cluster de Atlas (F3-08).
