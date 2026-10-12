# 2026-10-09 — Fase 9: F9-10, el runbook del ingreso con OAuth (la parte de la IA)

- Autor: Claude Sonnet 5.5
- Duración aprox: media sesión (de una tarea de 5 puntos 🔑 que necesita al usuario)

## Objetivo

F9-10 es "lo único que no se puede hacer sin las cuentas del usuario". Lo que sí puede hacer la IA, y
queda listo para que el usuario lo siga sin adivinar: el runbook, la prueba guiada y una forma segura de
ver qué claims trae una cuenta real.

## Qué se hizo

- **`docs/runbooks/oauth.md`** (el primer runbook del repo; el general es F3-11): qué crear en Google
  Cloud y en Microsoft Entra, por ambiente; las redirect URIs exactas; las variables; la tabla de
  vencimiento del secreto de Microsoft; cómo rotar cada secreto (con los dos vivos a la vez) y qué hacer
  si se filtra uno; la prueba guiada en 11 pasos, con su tabla de resultados; la prueba de la PWA
  instalada; y una tabla de síntomas.
- **`pnpm --filter @wasabi-cross/api oauth:inspect-token`**: lee un ID token por la entrada estándar
  (no por argumento, para que no quede en el historial del shell) y dice qué claims trae, de qué tipo de
  cuenta es, si el `iss` y el `aud` corresponden y **si la API crearía la cuenta**, con la misma regla
  que Better Auth para Microsoft. No imprime ningún valor personal. 27 tests (`id-token-report`).
- Enlazado desde `docs/README.md` y desde `apps/api/.env.example`.

## Decisiones tomadas

- **No se agregó un log de claims a la API.** El criterio dice "se decodifica el ID token (en dev, nunca
  se loguea)". Un log de nombres de claims en la ruta del ingreso es código de producción para algo que
  se hace una vez; el runbook usa `jwt.ms` (la página de Microsoft que decodifica en el navegador) con el
  cliente de dev, y saca la redirect URI después.
- **El informe no muestra valores, ni siquiera enmascarados.** Se puede pegar en una bitácora sin pensar.
- **El script se niega con `NODE_ENV=production`**: es para dev y staging.

## Bloqueos / lo que no se sabe todavía

- **Para Microsoft, el email llega verificado sólo si el registro de la app pide dos claims
  opcionales.** Better Auth usa `email_verified` si viene, y si no, mira `verified_primary_email` y
  `verified_secondary_email`, que no vienen por defecto en el ID token. Sin ellos nadie entra con
  Microsoft (aviso `WC-OAUTH-400-002`), y nada en la API lo dice claramente. Está al principio de la
  sección de Microsoft del runbook y en el STATE.
- **Staging y prod no se pueden hacer**: el dominio no está decidido y F3-07 no creó los ambientes. Las
  redirect URIs llevan el host real.
- **Lo que el runbook deja como tabla a completar**, porque no se puede saber sin probarlo en el aparato
  con cuentas reales: qué claims trae una cuenta de Outlook de verdad, y si la sesión queda en la PWA
  instalada con cada proveedor (iPhone, Android, escritorio). No lo supuse.
- Detalles de las consolas de Google y de Entra que cambian con el tiempo (nombres de menú, si la
  publicación pide revisión): el runbook los dice con la salvedad de verificarlos.

## Próximo paso

Debe coincidir con el punto 10 de "Próximo paso" en [STATE.md](../STATE.md): que el usuario cree el
cliente de Google y el registro de Microsoft siguiendo el runbook, corra la prueba guiada en dev y anote
los resultados; después, staging, cuando haya dominio y ambientes. Con la foto en desarrollo todavía por
decidir.
