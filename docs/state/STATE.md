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
  **Ojo:** este modelo no coincide con los mockups (ver spec §5.1); F1-01 lo corrige.
- `@wasabi-cross/ui`: cinco Componentes Cross con tema dark/light y Storybook.
- Catálogo de 34 ejercicios con seed idempotente y `GET /api/v1/exercises/catalog`.
- CI en GitHub Actions: build, formato, lint, typecheck, tests con umbral de coverage al 90%,
  Storybook y audit de dependencias.

## En progreso

**Fase 1 — El loop del atleta, planificada.** 18 tareas, 71 puntos, en
[docs/ACTION-PLAN.md](../ACTION-PLAN.md). La spec ganó la §5.1 con el modelo de ejercicios, marcas y
porcentajes. Todo en una PR a la espera de revisión; ninguna tarea arrancó.

## Bloqueado

Nada.

## Próximo paso

1. Revisar y mergear la PR con el plan de la Fase 1 y la spec §5.1.
2. Cargar la Fase 1 en Trello con `/trello-sync F1`, recién después del merge: el plan manda en el
   contenido, y conviene que esté aprobado antes de volverlo tarjetas.
3. Arrancar **F1-01** (schemas). En paralelo se puede tomar **F1-09** (shell del front), que no
   depende de nada.
4. Nombrar a mano las seis etiquetas del tablero para cerrar F0-08.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Max (Mercado Pago / Stripe / otro).
- **Proveedor de email.** Sin él no hay recupero de contraseña, y el mockup de login tiene el link.
  Queda fuera de la Fase 1 hasta que se decida.
- **Herramienta de migraciones** (`migrate-mongo` u otra). Planificada en F1-02; se elige ahí.
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

2026-09-18 — plan de la Fase 1 y spec §5.1. Ver [bitácora](./bitacora/2026-09-18-plan-fase-1.md).
