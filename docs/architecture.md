# Arquitectura técnica — Wasabi Cross

Detalle técnico que soporta [la spec de producto](./spec/wasabi-cross.spec.md) §7. Este documento cambia con más frecuencia que la spec; si hay una decisión estructural detrás de un cambio acá, registrarla como [ADR](./adr).

## Estructura de carpetas (monorepo)

Propuesta inicial — ajustar en un ADR cuando se bootstrapee el código real y se confirme la herramienta de workspaces (pnpm asumido, no confirmado).

```
wasabi-cross/
├── apps/
│   ├── web/            # React PWA
│   └── api/              # Node API REST
├── packages/
│   ├── schemas/          # @wasabi-cross/schemas — Zod compartido front/back
│   └── ui/                # @wasabi-cross/ui — Componentes Cross + Storybook
├── docs/
└── CLAUDE.md
```

## Backend: modular monolith + hexagonal-lite

Un solo deployable. Cada módulo vive en `apps/api/src/modules/<modulo>/` con tres capas:

```
<modulo>/
├── domain/          # entidades, value objects, reglas de negocio puras — sin dependencias externas
├── application/     # casos de uso, orquestación — depende de domain, no de infrastructure
└── infrastructure/  # repositorios Mongo, controllers HTTP, adaptadores externos
```

**Regla de dependencia:** un módulo nunca importa el modelo/entidad de otro módulo directamente. La comunicación es por interfaces (inyectadas) o por eventos de dominio internos.

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

## Health checks

- `GET /health` — liveness. No depende de nada externo (Mongo, etc.). Si responde, el proceso está vivo.
- `GET /ready` — readiness. Hace ping a Mongo. Si falla, el orquestador no debe enrutar tráfico a esa instancia.

## API REST y OpenAPI

Versionada (`/api/v1/...`). El spec OpenAPI se **genera** desde los schemas Zod de `@wasabi-cross/schemas` — nunca se escribe a mano, porque se desactualiza siempre. Documentación servida con Swagger.

## Decisiones de arquitectura

Cambios estructurales relevantes (elegir una librería, cambiar un patrón, un trade-off de infra) se registran como ADR corto en [docs/adr](./adr), no acá. Este documento describe el estado actual; el ADR explica por qué se llegó a él.
