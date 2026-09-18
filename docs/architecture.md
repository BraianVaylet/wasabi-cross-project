# Arquitectura técnica — Wasabi Cross

Detalle técnico que soporta [la spec de producto](./spec/wasabi-cross.spec.md) §7. Este documento cambia con más frecuencia que la spec; si hay una decisión estructural detrás de un cambio acá, registrarla como [ADR](./adr).

## Estructura de carpetas (monorepo)

Estructura real del repo desde la Fase 0. La herramienta de workspaces es **pnpm** ([ADR-0002](./adr/0002-pnpm-workspaces-como-monorepo.md)) y el framework HTTP de la API es **Fastify** ([ADR-0003](./adr/0003-fastify-como-framework-http.md)).

```
wasabi-cross/
├── apps/
│   ├── web/               # React PWA (Vite)
│   └── api/               # API REST (Fastify)
│       └── src/
│           ├── config/     # entorno validado con Zod
│           ├── shared/     # logger, errores, Mongo, IDs
│           ├── modules/    # auth, exercises, health…
│           └── scripts/    # seed y utilidades de línea de comandos
├── packages/
│   ├── schemas/           # @wasabi-cross/schemas — Zod compartido front/back
│   └── ui/                # @wasabi-cross/ui — Componentes Cross + Storybook
├── docs/
└── CLAUDE.md
```

Las versiones compartidas entre workspaces viven en el `catalog:` de `pnpm-workspace.yaml`: un
workspace que quiera otra versión tiene que escribirla explícitamente, así "sin duplicar
dependencias" es verificable y no una convención.

## Backend: modular monolith + hexagonal-lite

Un solo deployable. Cada módulo vive en `apps/api/src/modules/<modulo>/` con tres capas:

```
<modulo>/
├── domain/          # entidades, value objects, reglas de negocio puras — sin dependencias externas
├── application/     # casos de uso, orquestación — depende de domain, no de infrastructure
└── infrastructure/  # repositorios Mongo, controllers HTTP, adaptadores externos
```

**Regla de dependencia:** un módulo nunca importa el modelo/entidad de otro módulo directamente. La comunicación es por interfaces (inyectadas) o por eventos de dominio internos.

Esto no es sólo una convención escrita: `eslint.config.js` la hace cumplir. `domain` y `application` no pueden importar de `infrastructure`, y ningún módulo puede importar el interior de otro. Cuando un módulo necesita algo de otro —por ejemplo, `exercises` necesitando el cupo del plan de `subscriptions` o guardar marcas en `records`— define un **puerto** con lo que necesita, y otro módulo lo cumple sin importarlo. Los conecta la **raíz de composición** (`apps/api/src/composition.ts`, más `app.ts` para las rutas): es el único lugar que conoce a todos los módulos, y si un contrato no coincide, TypeScript lo marca ahí.

Lista de módulos y qué hace cada uno: ver [spec §7](./spec/wasabi-cross.spec.md#módulos-de-dominio).

## Eventos de dominio

In-process por ahora (sin cola de mensajes); se revisa si hace falta cola cuando el volumen lo justifique — no antes (YAGNI).

Ejemplo de payload:

```json
{
  "event": "pr.achieved",
  "userId": "usr_789",
  "exerciseId": "exo_45",
  "recordId": "rec_123",
  "kind": "rm",
  "previousValue": 95,
  "newValue": 100,
  "unit": "kg",
  "occurredAt": "2026-09-17T14:03:11.412Z"
}
```

Consumidores típicos: `notifications` (avisar al usuario), `stats` (recalcular agregaciones). Ninguno de los dos se acopla al flujo principal de `records`.

## Logs (JSON, Pino)

```json
{
  "ts": "2026-09-17T14:03:11.412Z",
  "level": "error",
  "env": "prod",
  "service": "api",
  "module": "records",
  "action": "createRecord",
  "requestId": "01J9X7K2...",
  "userId": "usr_789",
  "exerciseId": "exo_45",
  "durationMs": 42,
  "errorCode": "WC-RM-422-001",
  "msg": "RM value must be greater than zero",
  "meta": { "value": -5 }
}
```

**Reglas:**

- Nunca loguear passwords, tokens ni datos de pago.
- `requestId` viaja del front al back y vuelve al usuario en el mensaje de error (para poder correlacionar un reporte de soporte con el log exacto).
- `errorCode` siempre que el log sea de un error de negocio — ver [diccionario de códigos](./error-codes.md).

## Migraciones

Versionadas y reversibles con migrate-mongo ([ADR-0005](./adr/0005-migraciones-con-migrate-mongo.md)).
Viven en `apps/api/src/migrations/`, en TypeScript, una por archivo, con nombre
`AAAAMMDDHHMMSS-descripcion.ts` y dos funciones: `up` y `down`.

- Corren **una sola vez por deploy, antes de levantar la API** — nunca al arrancar cada instancia.
- `/ready` responde no-listo mientras haya migraciones pendientes.
- Una migración **no importa código de la app**: es una foto de la base en ese momento.
- Contra una misma base se usa siempre el mismo modo: `migrate` (desde `src/`) en desarrollo,
  `migrate:dist` (compilado) en los ambientes desplegados.

## Transacciones y cupos del plan

El cupo de ejercicios (spec §4) se controla en una transacción de Mongo, junto con el alta que
consume el cupo. **Mongo tiene que ser un replica set**, aunque sea de un nodo: Atlas lo es; en
local, ver `apps/api/.env.example`.

Una transacción sola no alcanza para que dos altas simultáneas no se pasen del límite: Mongo aísla
por snapshot, y dos transacciones que cuentan 9 e insertan documentos distintos confirman las dos.
Por eso cada una escribe además un documento de lock por usuario (`entitlement_locks`): la segunda
choca, se reintenta y cuenta 10. Hay un test que lo demuestra, y una prueba inversa confirmó que
sin el lock ese test falla.

## Health checks

- `GET /health` — liveness. No depende de nada externo (Mongo, etc.). Si responde, el proceso está vivo.
- `GET /ready` — readiness. Hace ping a Mongo y verifica que no haya migraciones pendientes. Si algo falla, el orquestador no debe enrutar tráfico a esa instancia.

## API REST y OpenAPI

Versionada (`/api/v1/...`). El spec OpenAPI se **genera** desde los schemas Zod de `@wasabi-cross/schemas` — nunca se escribe a mano, porque se desactualiza siempre. Documentación servida con Swagger.

**Sesión antes que nada.** El guard de sesión va en el hook `onRequest` de cada ruta protegida, no en `preHandler`: en Fastify la validación del cuerpo corre antes de `preHandler`, y ahí un request sin sesión con un cuerpo inválido recibía 400 en vez de 401 — podía sondear el contrato de la API sin estar autenticado.

## Decisiones de arquitectura

Cambios estructurales relevantes (elegir una librería, cambiar un patrón, un trade-off de infra) se registran como ADR corto en [docs/adr](./adr), no acá. Este documento describe el estado actual; el ADR explica por qué se llegó a él.
