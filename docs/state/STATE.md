# Estado actual — Wasabi Cross

> Se lee al **empezar** cada sesión de trabajo. Se sobreescribe (no acumula historial — para eso está la [bitácora](./bitacora)).

## Fase actual

**Fase 0 — Fundaciones: cerrada.** PR #1 mergeada el 2026-09-17 con CI verde, y las siete tarjetas
de código movidas a `Completadas` en Trello. El monorepo corre: `apps/web`, `apps/api`,
`packages/schemas` y `packages/ui`.

Queda abierta sólo F0-08 (el tablero): las seis etiquetas de Trello siguen sin nombre, y el MCP no
puede nombrarlas. Es el único pendiente de la fase y no bloquea nada.

Lo que hay hoy, en una línea cada uno:

- API Fastify con envelope de error único, logger Pino con redacción, y `/health` + `/ready`.
- Auth con Better Auth sobre Mongo: registro, login, sesión persistida, rate limit.
- `@wasabi-cross/schemas`: `User`, `Exercise`, `ExerciseRecord` en Zod, fuente única de tipos.
- `@wasabi-cross/ui`: cinco Componentes Cross con tema dark/light y Storybook.
- Catálogo de 34 ejercicios con seed idempotente y `GET /api/v1/exercises/catalog`.
- CI en GitHub Actions: build, formato, lint, typecheck, tests con umbral de coverage al 90%,
  Storybook y audit de dependencias.

## En progreso

Nada. La Fase 1 todavía no está escrita en el plan de acción.

## Bloqueado

Nada.

## Próximo paso

1. **Escribir la Fase 1 en [docs/ACTION-PLAN.md](../ACTION-PLAN.md)**, con el mismo formato de tarea
   y story points Fibonacci. Lo que la spec pide a continuación: CRUD de ejercicios con
   entitlements de plan validados en el backend, carga de RM/tiempo/reps, cálculo de porcentajes de
   carga, y las páginas de la spec §5 (Home, Ejercicio, Nuevo ejercicio).
2. Nombrar a mano las seis etiquetas del tablero para cerrar F0-08.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Max (Mercado Pago / Stripe / otro).
- **Migraciones de Mongo.** La spec §12 pide `migrate-mongo` o similar; hoy los índices se aseguran
  al arrancar la API. Alcanzó para la Fase 0, pero el primer cambio de forma de datos necesita la
  herramienta de verdad.
- **Unidad de peso por usuario.** Los registros de RM aceptan kg y lb por registro; falta definir si
  el usuario elige una unidad por defecto en su perfil.
- **TypeScript 7.** Hoy el monorepo está en 5.9.3 porque `typescript-eslint@8` declara
  `typescript >=4.8.4 <6.1.0` como peer, y con TS 7.0 directamente se niega a cargar (probado:
  build, typecheck y tests pasan; el lint muere). `.github/dependabot.yml` ignora
  `typescript >=6.1.0` con el mismo rango. Revisar cuando typescript-eslint lo soporte
  (typescript-eslint/typescript-eslint#10940, apunta a TS ≥7.1).

Cerradas en la Fase 0: herramienta de monorepo → pnpm ([ADR-0002](../adr/0002-pnpm-workspaces-como-monorepo.md));
framework HTTP → Fastify ([ADR-0003](../adr/0003-fastify-como-framework-http.md)); forma de los IDs
→ prefijo por entidad ([ADR-0004](../adr/0004-ids-de-dominio-con-prefijo.md)).

## Cómo correrlo

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # completar MONGODB_URI y BETTER_AUTH_SECRET
pnpm verify                              # build + formato + lint + typecheck + test
pnpm dev                                 # API en :3000, web en :5173
pnpm --filter @wasabi-cross/api seed     # catálogo de ejercicios
```

## Última actualización

2026-09-18 — reglas de Dependabot después de la PR #5. Ver [bitácora](./bitacora/2026-09-18-dependabot-y-typescript-7.md).
