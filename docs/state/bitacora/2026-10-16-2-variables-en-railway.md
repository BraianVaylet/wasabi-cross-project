# 2026-10-16 (2) — Variables cargadas en Railway por MCP

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta

## Objetivo

La [entrada de la mañana](./2026-10-16-primer-deploy-en-railway.md) dejó dos servicios caídos por
variables que faltaban. El usuario pidió cargar las que no son secretas y poner STATE al día.

## Qué se hizo

- **PR #129 mergeada** (F3-13 a F3-15, 23:04 UTC) y CI de `main` en verde. Railway redeployó sola los dos
  servicios con el commit nuevo y fallaron por lo mismo: las variables no habían cambiado.
- **Variables de la API** (por MCP, con `skipDeploys`): `WEB_ORIGIN` y `BETTER_AUTH_URL`, las dos con el
  dominio de Railway del servicio.
- **Variables de la landing**: `LANDING_INDEXABLE=0` y `PUBLIC_APP_URL` (el dominio de la API, para que
  aparezca "Entrar"). Esta vez sí redeployó.
- **La landing desplegó bien** (`SUCCESS`, healthcheck `/health`). No tiene dominio público: nadie la ve
  todavía.

## Decisiones tomadas

- **La API no se redeployó.** Sin credenciales de OAuth no arranca, y su `preDeploy` migraría y sembraría
  la base antes de fallar en el arranque. Mejor que el primer deploy de la API sea el que tiene todo.
- **La landing sí**, porque es un sitio estático sin base de datos, y es lo que arregla su falla.
- **`LANDING_INDEXABLE=0` en `production`** es un desvío del IaC (`1` en producción), a propósito y
  temporal: con `1` el build exige `PUBLIC_SITE_URL` y el contacto legal. Queda anotado en STATE.

## Bloqueos / lo que no funcionó

- **Un `until` con `date` se pasó de largo** y la tool lo mandó al fondo: comparé una hora del día sin
  contar el cambio de fecha. No afectó nada; para esperar a un deploy alcanza con volver a preguntar.
- No se pueden ver los valores de las variables sin traer los secretos al contexto. Se verificó por
  nombre y por el resultado del deploy.

## Próximo paso

Debe coincidir con el punto 14 de "Próximo paso" en [STATE.md](../STATE.md): el par de credenciales de OAuth
en la API (F9-10) y recién después, un redeploy.
