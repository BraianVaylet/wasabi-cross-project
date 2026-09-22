# Estado actual — Wasabi Cross

> Se lee al **empezar** cada sesión de trabajo. Se sobreescribe (no acumula historial — para eso está la [bitácora](./bitacora)).

## Fase actual

**Fases 0 y 1: cerradas.** La 0 el 2026-09-17 (PR #1, CI verde) y la 1 el 2026-09-22, con F1-18. El
monorepo corre: `apps/web`, `apps/api`, `packages/schemas` y `packages/ui`. La Fase 2 todavía no
está desglosada en tareas.

Queda abierta sólo F0-08 (el tablero): las seis etiquetas de Trello siguen sin nombre, y el MCP no
puede nombrarlas. Es el único pendiente de la fase y no bloquea nada.

Lo que hay hoy, en una línea cada uno:

- API Fastify con envelope de error único, logger Pino con redacción, y `/health` + `/ready`.
- Auth con Better Auth sobre Mongo: registro, login, sesión persistida, rate limit.
- `@wasabi-cross/schemas`: `User`, `Exercise`, `ManagedExercise`, `ExerciseRecord` en Zod, fuente
  única de tipos, alineados con la spec §5.1.
- `@wasabi-cross/ui`: los Componentes Cross con tema dark/light y Storybook.
- Catálogo de 34 ejercicios con seed idempotente y `GET /api/v1/exercises/catalog`.
- CI en GitHub Actions: build, formato, lint, typecheck, tests con umbral de coverage al 90%,
  Storybook, audit de dependencias y el E2E de Playwright con su auditoría axe.

## En progreso

**Fase 1 — El loop del atleta: cerrada el 2026-09-22.** 19 tareas, 71 puntos. Un atleta se
registra, arma su lista, carga marcas y ve sus porcentajes, y el E2E recorre ese camino en cada PR.

**Fase 2 — Estadísticas: en curso, 3 de 10 tareas.** 44 puntos en total.

- **F2-01 · Contratos**: cerrada. El período, la serie, el resumen y los agregados, más
  `summarize()` en el paquete compartido.
- **F2-02 · El ejercicio propio lleva capacidades y grupos musculares**: cerrada. Obligatorias en el
  alta, el segmento se deriva, y una migración completa los que ya estaban.
- **F2-03 · El formulario las pregunta**: cerrada. Sale el `CheckboxGroup` de `@wasabi-cross/ui`.
- Quedan F2-04 a F2-10: el módulo `stats` en la API, el gráfico y la pantalla del mockup 10.

- **F1-01 · Schemas**: cerrada. El modelo ya coincide con los mockups.
- **F1-02 · Migraciones**: cerrada. migrate-mongo
  ([ADR-0005](../adr/0005-migraciones-con-migrate-mongo.md)).
- **F1-03 · Entitlements**: cerrada, con revisión humana de sus tests.
- **F1-04 · Cálculo de porcentajes**: cerrada. Reglas compartidas en schemas
  ([ADR-0006](../adr/0006-reglas-de-dominio-compartidas-en-schemas.md)).
- **F1-05 · Agregar y listar ejercicios**: cerrada.
- **F1-06 · Editar y borrar**: cerrada.
- **F1-07 · Marcas e historial**: cerrada. `POST` y `GET /api/v1/exercises/:id/records`, con valor
  actual, mejor marca y cursor.
- **F1-08 · Preferencias**: cerrada. `GET` y `PATCH /api/v1/me/preferences`, en el módulo `users`.
- **F1-09 · Shell del front**: cerrada. Rutas protegidas, sesión, splash, header y menú.
- **F1-10 · Login y registro**: cerrada. `/login` y `/registro` con TanStack Form.
- **F1-11 · Home**: cerrada. La lista de ejercicios con sus estados.
- **F1-12 · Nuevo ejercicio**: cerrada. Formulario del mockup 9.
- **F1-13a · Detalle, porcentajes**: cerrada. F1-13 se partió en dos.
- **F1-13b · Detalle, historial**: cerrada. Historial paginado y mejor marca en tiempo.
- **F1-14 · Cargar una marca**: cerrada. El modal del mockup 11, con la marca en el historial
  antes de que responda la API y rollback si la rechaza.
- **F1-15 · Editar y borrar**: cerrada. Desde el lápiz del detalle, con borrado confirmado
  escribiendo el nombre.
- **F1-16 · Perfil**: cerrada. Porcentajes por defecto y tema, guardados en la API.
- **F1-17 · Aviso de nueva versión**: cerrada. El popup de la PWA.
- **F1-18 · E2E y axe en CI**: cerrada. Playwright contra la app entera con un Mongo efímero,
  auditando cada pantalla de la fase en los dos temas. **Con esto la Fase 1 queda cerrada.**

## Bloqueado

Nada.

## Próximo paso

1. Seguir con **F2-04** (estadísticas de un ejercicio), que ya tiene sus contratos, o con **F2-06**
   (el Componente Cross de gráfico), que no depende de la API.
2. Cargar en Trello las diez tarjetas de la Fase 2 y mover lo cerrado (`/trello-sync`): el MCP de
   Trello se desconectó en la sesión del 2026-09-22 y quedó todo sin sincronizar, incluida F1-18.
3. Nombrar a mano las seis etiquetas del tablero para cerrar F0-08.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Max (Mercado Pago / Stripe / otro).
- **Proveedor de email.** Sin él no hay recupero de contraseña, y el mockup de login tiene el link.
  Queda fuera de la Fase 1 hasta que se decida.
- **TypeScript 7.** Hoy el monorepo está en 6.0.3 (PR #8) porque `typescript-eslint@8` declara
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
- Una marca no puede tener fecha futura (spec §5.1).

Defaults fijados sin consulta explícita, para revisar en la PR: carga redondeada al 0,5 kg,
repeticiones redondeadas hacia abajo con mínimo 1, "valor actual" = la marca de fecha más reciente, y
si la mejor marca se repite, cuenta la primera vez que se logró. Un tiempo se muestra como mm:ss (4:32)
y, por debajo del minuto, en segundos.

Cerradas en la Fase 0: herramienta de monorepo → pnpm ([ADR-0002](../adr/0002-pnpm-workspaces-como-monorepo.md));
framework HTTP → Fastify ([ADR-0003](../adr/0003-fastify-como-framework-http.md)); forma de los IDs
→ prefijo por entidad ([ADR-0004](../adr/0004-ids-de-dominio-con-prefijo.md)). Cerrada en F1-02:
herramienta de migraciones → migrate-mongo ([ADR-0005](../adr/0005-migraciones-con-migrate-mongo.md)).

## Cómo correrlo

```bash
pnpm install
pnpm verify                              # build + formato + lint + typecheck + test
pnpm e2e                                 # Playwright: flujo principal + axe (levanta todo solo)

# Para desarrollar contra datos que se tiran al cerrar: migra y siembra solo.
pnpm --filter @wasabi-cross/api dev:ephemeral   # API en :3100, Mongo efímero

# Contra un Mongo propio: las variables de apps/api/.env.example van EXPORTADAS en la shell
# (nadie lee el .env), MONGODB_URI tiene que ser un replica set, y antes de levantar:
pnpm --filter @wasabi-cross/api migrate up   # sin esto, /ready responde no-listo
pnpm --filter @wasabi-cross/api seed         # catálogo de ejercicios
pnpm dev                                     # API en :3000, web en :5173
```

## Última actualización

2026-09-22 — arrancó la Fase 2: F2-01 (contratos), y F2-02 y F2-03 (el ejercicio propio con sus
capacidades). Ver [la bitácora de F2-02 y F2-03](./bitacora/2026-09-22-f2-02-f2-03-capacidades.md),
[la de F2-01](./bitacora/2026-09-22-f2-01-contratos-estadisticas.md) y
[la de F1-18](./bitacora/2026-09-22-f1-18-e2e.md), que cerró la Fase 1.
