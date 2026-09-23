# Railway — Infra as Code (F3-04)

`railway.ts` describe el servicio de Wasabi Cross en Railway (spec §12): un solo servicio, la
API sirviendo también el front compilado (ADR-0007). Es código, se prueba como código
(`apps/api/src/deploy/railway-config.test.ts`) y se revisa en PR como cualquier otro cambio.

## Qué hace este archivo y qué no

- **Sí**: declara build, start, pre-deploy (migraciones), healthcheck y qué variables existen.
- **No**: no crea el proyecto en Railway, no carga los secretos, no corre nada solo. `plan` y
  `apply` los corre una persona, a mano, con la CLI — es 🔑 en `docs/ACTION-PLAN.md` (F3-07).

## Antes de la primera vez

```bash
npm install -g @railway/cli   # o: pnpm dlx railway
railway login
railway link                  # elegir el proyecto y el ambiente (staging o production)
```

## Ver qué cambiaría, sin tocar nada

```bash
railway config plan
```

Es de sólo lectura. Los valores de las variables salen ocultos por defecto (`«hidden»`); con
`--show-values` se ven los que no son secretos.

## Aplicar

```bash
railway config apply
```

Pide confirmar los cambios exactos del `plan`. Un cambio destructivo (borrar un servicio o una
variable) se marca antes de confirmar — no debería aparecer ninguno con este archivo tal como
está.

## Los secretos (`preserve()`)

`MONGODB_URI`, `BETTER_AUTH_SECRET`, `WEB_ORIGIN` y `BETTER_AUTH_URL` están como `preserve()`:
"dejá el valor que ya está en Railway". Se cargan una vez a mano en el dashboard o con
`railway variables set`, nunca en este archivo. Runbook de rotación: F3-11.
