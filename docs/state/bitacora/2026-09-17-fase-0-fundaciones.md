# 2026-09-17 — Fase 0: de cero código a monorepo funcionando

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión larga

## Objetivo

Arrancar el desarrollo. Hasta acá el repo era sólo documentación: spec, arquitectura, backlog y
tablero, sin una línea de código. Braian pidió cerrar la Fase 0 entera en una sesión.

## Qué se hizo

Siete commits, uno por tarea, en la rama `feat/fase-0-fundaciones`:

- **F0-01 · Monorepo.** pnpm workspaces con catálogo de versiones compartidas, TypeScript strict
  (más `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`), ESLint con type-checking,
  Prettier, Vitest con umbral de coverage al 90%, y CI en GitHub Actions con un job de verificación
  y otro de audit de dependencias. Dependabot configurado.
- **F0-02 · `@wasabi-cross/schemas`.** `User`, `Exercise` y `Record` en Zod, con los límites de plan
  y los porcentajes de carga por default de la spec. 63 tests, 100% de coverage.
- **F0-03 · Better Auth + Mongo.** Registro, login y sesión persistida. Rate limit, chequeo de
  contraseñas filtradas, cookies httpOnly.
- **F0-04 · Error envelope + Pino.** `{ errorCode, message, requestId }` en toda respuesta de error,
  y logger con redacción por path de passwords, tokens, cookies y datos de tarjeta.
- **F0-05 · Health checks.** `/health` sin dependencias, `/ready` con ping a Mongo.
- **F0-06 · `@wasabi-cross/ui` + Storybook.** Tokens sacados de los mockups, cinco Componentes Cross
  con story y test, addon-a11y en modo error.
- **F0-07 · Catálogo de ejercicios.** 34 ejercicios base y un seed idempotente.

Además: `CLAUDE.md`/`AGENT.md` con la tabla de comandos reales, `docs/architecture.md` actualizado
con la estructura de carpetas que existe de verdad, y tres ADRs nuevos.

## Decisiones tomadas

- **pnpm workspaces sobre npm workspaces y sobre Turborepo** ([ADR-0002](../../adr/0002-pnpm-workspaces-como-monorepo.md)).
  El catálogo de pnpm convierte "sin duplicar dependencias" —criterio de aceptación de F0-01— en
  algo verificable. Turborepo quedó afuera por YAGNI: con cuatro workspaces, `pnpm -r` alcanza.
- **Fastify sobre Express y sobre Hono** ([ADR-0003](../../adr/0003-fastify-como-framework-http.md)).
  Pino es su logger nativo y el mismo schema Zod valida la entrada, serializa la salida, tipa el
  handler y genera el OpenAPI. Es el que más cosas de la arquitectura trae resueltas.
- **IDs de dominio con prefijo, usados como `_id`** ([ADR-0004](../../adr/0004-ids-de-dominio-con-prefijo.md)).
  `usr_…`, `exo_…`, `rec_…`. Un ID suelto en un log se explica solo, y pasar un `exerciseId` donde
  va un `userId` falla en validación.
- **TypeScript 5.9.3 y no 7.x.** TS 7 ya salió, pero `typescript-eslint@8` declara
  `typescript >=4.8.4 <6.1.0` como peer: subir hoy deja al monorepo sin lint con tipos, que es
  justo lo que sostiene la prohibición de `any`. Revisar cuando typescript-eslint soporte TS 7.
- **El tipo de `Record` se exporta como `ExerciseRecord`.** En TypeScript, `Record` es el utilitario
  `Record<K, V>`: exportarlo con ese nombre lo pisaría en todo archivo que importe del paquete. El
  concepto de la spec no cambia, sólo el nombre del tipo.
- **Las reglas de arquitectura se hacen cumplir con ESLint, no con disciplina.** `domain` y
  `application` no pueden importar `infrastructure`, ningún módulo puede importar el interior de
  otro, y `@wasabi-cross/ui` no puede hacer fetch. Están escritas en `eslint.config.js`.
- **El diccionario de códigos de error se verifica con un test.** `ERROR_CATALOG` y
  `docs/error-codes.md` se comparan en las dos direcciones: un código en el código sin entrada en
  el diccionario rompe el build, y al revés también.

## Bloqueos / lo que no funcionó

- **`z.url()` acepta `localhost:5173`.** Lo lee como esquema `localhost:`. Ese valor iba directo a
  la configuración de CORS. Lo encontró el test de `parseEnv`, escrito después del código. Ahora
  `WEB_ORIGIN` y `BETTER_AUTH_URL` exigen `http` o `https`.
- **Comparar el script de bootstrap del tema como texto no funciona.** Prettier reformatea el
  JavaScript embebido en el HTML, así que el string del paquete y el del `index.html` nunca iban a
  coincidir carácter por carácter. Se cambió por un test que **ejecuta** el script del HTML y
  compara su decisión contra `resolveInitialTheme` para los cinco casos. Salió mejor que la idea
  original: verifica comportamiento en vez de texto.
- **`typescript-eslint` todavía no soporta TypeScript 7.** Ver arriba.
- **El TDD fue parcial.** Varios módulos se escribieron antes que sus tests, contra lo que pide la
  spec §7. Los tests terminaron completos (coverage por encima del 90% en los cuatro workspaces) y
  encontraron el bug de `z.url()`, pero el orden no fue el que manda la spec. Queda dicho.
- **El tamaño de la sesión.** Veinticinco story points en una sola tanda va contra "PRs pequeñas"
  de la spec §8. Se compensó con un commit convencional por tarea, pero la PR es grande igual.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar y mergear la PR de la Fase 0,
nombrar las etiquetas de Trello y mover las tarjetas de F0-01 a F0-07, y después escribir la Fase 1
en el plan de acción.
