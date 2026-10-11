# Railway — Infra as Code (F3-04, F10-12)

`railway.ts` describe los servicios de Wasabi Cross en Railway (spec §12), dos del mismo repo:

| Servicio               | Qué es                                                           | Build                                                                    | Arranca                              | Salud     |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ | --------- |
| `wasabi-cross`         | La API, que sirve también el front compilado (ADR-0007)          | `pnpm --filter @wasabi-cross/api... --filter @wasabi-cross/web... build` | `node apps/api/dist/server.js`       | `/ready`  |
| `wasabi-cross-landing` | La landing: un sitio estático con su servidor (ADR-0013, F10-11) | `pnpm --filter @wasabi-cross/landing... build`                           | `node apps/landing/server/server.ts` | `/health` |

Es código, se prueba como código (`apps/api/src/deploy/railway-config.test.ts`) y se revisa en PR
como cualquier otro cambio.

## Dos servicios del mismo repo: qué dispara cada deploy

**Los _watch paths_ se declaran acá**, en `build.watchPatterns` de cada servicio (F10-12 lo
comprobó: el IaC los admite, aunque la referencia de `service()` no los documente). Sin ellos, un
push redeploya los dos servicios, y un cambio de copy reiniciaría la API.

| Servicio               | Se redeploya si cambia                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `wasabi-cross`         | `apps/api/**`, `apps/web/**`, `packages/**`, y la raíz (`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json`) y `.railway/**` |
| `wasabi-cross-landing` | `apps/landing/**`, `packages/**`, y la raíz y `.railway/**`                                                                      |

`docs/**` no dispara ninguno. Cada `build` usa `--filter <paquete>...`: el paquete **y sus
dependencias** (`schemas` y `ui`, en orden), y nada más. La app ya no corre `pnpm build`, que con
la landing sumaría su build al deploy de la API.

## Las variables de la landing

Todas **de build**: Astro las inlinea al compilar (spec §5.7), así que tienen que estar cuando se
construye. Ninguna es un secreto: salen en el HTML publicado. Las del contacto legal son datos de
una persona, por eso no van escritas en el repo.

| Variable               | Valor                             | Por qué                                                                                                                        |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`      | `preserve()`: se carga en Railway | El origen público de la landing. Depende del dominio, que no está decidido (F10-13).                                           |
| `PUBLIC_APP_URL`       | `preserve()`: se carga en Railway | A dónde lleva "Entrar". Sin ella el sitio sale sin los botones de ingreso.                                                     |
| `PUBLIC_CONTACT_NAME`  | `preserve()`: se carga en Railway | Quién responde en `/privacidad/` y `/terminos/` (F10-09). Va con el email o ninguna.                                           |
| `PUBLIC_CONTACT_EMAIL` | `preserve()`: se carga en Railway | A dónde se escribe para ver, corregir o borrar los datos. Con `LANDING_INDEXABLE=1` y sin las dos, el build falla a propósito. |
| `LANDING_INDEXABLE`    | `1` en production, `0` en staging | Sólo production se indexa. Con `1` y sin `PUBLIC_SITE_URL` el build falla a propósito.                                         |
| `HOST`                 | `0.0.0.0`                         | En un contenedor hay que escuchar en todas las interfaces. `PORT` lo pone Railway.                                             |
| `LOG_LEVEL`            | `info`                            |                                                                                                                                |

**La landing no declara `NODE_ENV`, a propósito**: con `production` el instalador omitiría las
dependencias de desarrollo, y `astro` —que compila el sitio— es una de ellas. El servidor no lo
necesita. Esto no se pudo comprobar contra un Railway de verdad (no hay ambientes todavía, F3-07):
si el primer build de la landing falla por una dependencia que falta, es lo primero que hay que
mirar.

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

`MONGODB_URI`, `BETTER_AUTH_SECRET`, `WEB_ORIGIN` y `BETTER_AUTH_URL` —y, desde F10-12, las
credenciales de OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID` y
`MICROSOFT_CLIENT_SECRET` (runbook: [`docs/runbooks/oauth.md`](../docs/runbooks/oauth.md))—
están como `preserve()`:
"dejá el valor que ya está en Railway". Se cargan una vez a mano en el dashboard o con
`railway variables set`, nunca en este archivo. Runbook de rotación: F3-11.
