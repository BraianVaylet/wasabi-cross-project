# 2026-10-16 — Primer deploy en Railway: qué se vio por MCP

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta, sólo lectura

## Objetivo

El usuario creó el proyecto en Railway y disparó el primer deploy. Pidió conectar por MCP y revisarlo.
Nada se cambió en Railway: se miró el estado, los logs y la configuración (los nombres de las
variables, no sus valores).

## Qué se vio

- **El proyecto existe**: `acceptable-contentment`, en el espacio de trabajo personal, con **un solo
  ambiente, `production`**, y dos servicios: `@wasabi-cross/api` y `@wasabi-cross/landing`. STATE.md
  decía que no había ambientes (F3-07 sigue abierta: falta `staging`, y el IaC no se aplicó).
- **Los nombres no coinciden con el IaC**: `.railway/railway.ts` declara `wasabi-cross` y
  `wasabi-cross-landing`. Un `railway config plan` no los reconocería como los mismos servicios.
  La configuración de build, start, healthcheck y _watch paths_ sí es la del IaC, copiada a mano.
- **Los dos deploys del 2026-10-16 (22:51 UTC, desde `main` en `1bbf180`) fallaron**, y no hubo caída
  porque nada estuvo vivo antes:
  - **La landing, en el build**: `LANDING_INDEXABLE=1 necesita PUBLIC_SITE_URL: sin el sitio no hay
canonical`. Es la guarda de F10-04 haciendo lo que debe: faltan `PUBLIC_SITE_URL`,
    `PUBLIC_APP_URL` y el contacto legal (F10-09).
  - **La API, en el `preDeploy`**: el build compiló bien en Railway (Railpack, Node 24.21.0, pnpm
    11.7.0: schemas, ui, api y web). `migrate:dist up` cortó en `parseEnv` porque **faltan
    `WEB_ORIGIN` y `BETTER_AUTH_URL`**, antes de conectarse a Mongo. El `preDeploy` frenó el deploy
    como se diseñó (ADR-0005).
- **Las variables que tiene la API** (nombres): `BETTER_AUTH_SECRET`, `CLIENT_IP_HEADER`, `HOST`,
  `LOG_LEVEL`, `MONGODB_DB_NAME`, `MONGODB_URI`, `NODE_ENV`, `WEB_DIST_DIR`. **Ninguna credencial de
  OAuth.** La landing: `HOST`, `LANDING_INDEXABLE`, `LOG_LEVEL`.

## Lo que todavía no falló pero va a fallar

- **El `preDeploy` de la API ya llama a `seed:dist`, que `main` no tiene.** La configuración de
  Railway está por delante de `main`: ese script y `CLIENT_IP_HEADER` son de F3-13 y F3-14, que están
  en una PR sin mergear. Con las variables arregladas, el deploy cortaría ahí. **La PR tiene que
  entrar antes del próximo deploy.**
- **Sin ninguna credencial de OAuth, la API no arranca** (`bootstrap.ts`): el `/ready` no llega a
  responder. F9-10 (los clientes de Google y de Microsoft) es previa a un deploy sano.

## Decisiones tomadas

- Ninguna: la sesión no tocó nada. Lo que sigue es del usuario (variables, credenciales, nombres).

## Bloqueos / lo que no funcionó

- El log de build de la landing son unas 80 entradas con cada paso de buildkit: el MCP lo guardó en un
  archivo y hubo que leerlo con un script para encontrar el error.
- **Un costo de build que no hace falta**: el `pnpm install` del build baja el binario de MongoDB
  (122,6 MB) por el _postinstall_ de `mongodb-memory-server`, que es de los tests. Con la variable
  `MONGOMS_DISABLE_POSTINSTALL=1` en el servicio no lo bajaría. No se cambió: queda anotado.

## Próximo paso

Debe coincidir con el punto 14 de "Próximo paso" en [STATE.md](../STATE.md).
