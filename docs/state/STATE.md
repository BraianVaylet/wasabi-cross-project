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
- `@wasabi-cross/schemas`: `User`, `Exercise`, `ManagedExercise`, `ExerciseRecord` en Zod, fuente
  única de tipos, alineados con la spec §5.1.
- `@wasabi-cross/ui`: cinco Componentes Cross con tema dark/light y Storybook.
- Catálogo de 34 ejercicios con seed idempotente y `GET /api/v1/exercises/catalog`.
- CI en GitHub Actions: build, formato, lint, typecheck, tests con umbral de coverage al 90%,
  Storybook y audit de dependencias.

## En progreso

**Fase 1 — El loop del atleta.** 18 tareas, 71 puntos, cargadas en Trello.

- **F1-01 · Schemas**: cerrada. El modelo ya coincide con los mockups.
- **F1-02 · Migraciones**: cerrada. migrate-mongo
  ([ADR-0005](../adr/0005-migraciones-con-migrate-mongo.md)).
- **F1-03 · Entitlements**: cerrada, con revisión humana de sus tests.
- **F1-04 · Cálculo de porcentajes**: código hecho, en PR. Reglas compartidas en schemas
  ([ADR-0006](../adr/0006-reglas-de-dominio-compartidas-en-schemas.md)).

## Bloqueado

Nada.

## Próximo paso

1. Revisar y mergear la PR de F1-04.
2. Destrabadas y sin arrancar: **F1-05** (agregar y listar ejercicios, 8 puntos, camino crítico) y
   **F1-08** (preferencias). **F1-09** (shell del front) no depende de nada.
3. Nombrar a mano las seis etiquetas del tablero para cerrar F0-08.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Max (Mercado Pago / Stripe / otro).
- **Proveedor de email.** Sin él no hay recupero de contraseña, y el mockup de login tiene el link.
  Queda fuera de la Fase 1 hasta que se decida.
- **TypeScript 7.** Hoy el monorepo está en 5.9.3 porque `typescript-eslint@8` declara
  `typescript >=4.8.4 <6.1.0` como peer, y con TS 7.0 directamente se niega a cargar (probado:
  build, typecheck y tests pasan; el lint muere). `.github/dependabot.yml` ignora
  `typescript >=6.1.0` con el mismo rango. Revisar cuando typescript-eslint lo soporte
  (typescript-eslint/typescript-eslint#10940, apunta a TS ≥7.1).

Cerradas el 2026-09-18, ya volcadas en la spec §4, §5 y §5.1:

- Login sólo con email y contraseña en la Fase 1; username y Google, afuera.
- Los ejercicios de tiempo no tienen tabla de porcentajes.
- Los ejercicios del catálogo cuentan para el límite de 10 del plan Free.
- Bandas de carga: menos de 70% liviana, de 70% a 84% media, desde 85% pesada.
- El peso es sólo en kg. La opción de lb nunca estuvo en los mockups: la había agregado F0-02.

Defaults fijados sin consulta explícita, para revisar en la PR: carga redondeada al 0,5 kg,
repeticiones redondeadas hacia abajo con mínimo 1, y "valor actual" = la marca de fecha más reciente.

Cerradas en la Fase 0: herramienta de monorepo → pnpm ([ADR-0002](../adr/0002-pnpm-workspaces-como-monorepo.md));
framework HTTP → Fastify ([ADR-0003](../adr/0003-fastify-como-framework-http.md)); forma de los IDs
→ prefijo por entidad ([ADR-0004](../adr/0004-ids-de-dominio-con-prefijo.md)). Cerrada en F1-02:
herramienta de migraciones → migrate-mongo ([ADR-0005](../adr/0005-migraciones-con-migrate-mongo.md)).

## Cómo correrlo

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # MONGODB_URI tiene que ser un replica set (ver el archivo)
pnpm --filter @wasabi-cross/api migrate up   # sin esto, /ready responde no-listo
pnpm verify                              # build + formato + lint + typecheck + test
pnpm dev                                 # API en :3000, web en :5173
pnpm --filter @wasabi-cross/api seed     # catálogo de ejercicios
```

## Última actualización

2026-09-18 — F1-04, cálculo de porcentajes. Ver [bitácora](./bitacora/2026-09-18-f1-04-porcentajes.md).
