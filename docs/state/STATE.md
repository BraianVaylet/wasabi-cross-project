# Estado actual — Wasabi Cross

> Se lee al **empezar** cada sesión de trabajo. Se sobreescribe (no acumula historial — para eso está la [bitácora](./bitacora)).

## Fase actual

Fase 0 — Fundaciones, código terminado. El monorepo existe y corre: `apps/web`, `apps/api`,
`packages/schemas` y `packages/ui`, con CI en GitHub Actions.

Estado por tarea (ver [docs/ACTION-PLAN.md](../ACTION-PLAN.md)):

| Tarea                       | Código | Falta                   |
| --------------------------- | ------ | ----------------------- |
| F0-01 Monorepo              | ✅     | mover tarjeta en Trello |
| F0-02 Schemas Zod           | ✅     | mover tarjeta en Trello |
| F0-03 Better Auth + Mongo   | ✅     | mover tarjeta en Trello |
| F0-04 Error envelope + Pino | ✅     | mover tarjeta en Trello |
| F0-05 Health checks         | ✅     | mover tarjeta en Trello |
| F0-06 UI base + Storybook   | ✅     | mover tarjeta en Trello |
| F0-07 Seed del catálogo     | ✅     | mover tarjeta en Trello |
| F0-08 Tablero de Trello     | ➖     | nombrar las 6 etiquetas |

Ninguna está en `[x]`: el Definition of Done (spec §16) pide la tarjeta movida, y esa movida la
hace una persona, no la IA.

## En progreso

Pull request de la Fase 0 abierta contra `main` desde `feat/fase-0-fundaciones`. Siete commits, uno
por tarea. A la espera de revisión humana — la spec §9 pide revisión de persona en los flujos de
permisos, y F0-03 (auth) es exactamente eso.

## Bloqueado

Nada bloquea el código. Dos cosas dependen de una persona:

1. Nombrar a mano las seis etiquetas del tablero de Trello (el MCP no puede).
2. Mover las tarjetas de F0-01 a F0-07 cuando se apruebe la PR.

## Próximo paso

1. Revisar y mergear la PR de la Fase 0.
2. Nombrar las etiquetas de Trello y mover las tarjetas de F0-01 a F0-07.
3. Escribir la Fase 1 en [docs/ACTION-PLAN.md](../ACTION-PLAN.md): CRUD de ejercicios con
   entitlements de plan, carga de RM, cálculo de porcentajes y las páginas de la spec §5.

## Decisiones abiertas

- **Proveedor de pago** para la suscripción Max (Mercado Pago / Stripe / otro). Sigue abierta.
- **Migraciones de Mongo.** La spec §12 pide `migrate-mongo` o similar; hoy los índices se aseguran
  al arrancar la API. Alcanza para la Fase 0, pero el primer cambio de forma de datos necesita la
  herramienta de verdad.
- **Unidad de peso por usuario.** Los registros de RM aceptan kg y lb por registro; falta definir si
  el usuario elige una unidad por defecto en su perfil.

Cerradas en esta fase: herramienta de monorepo → pnpm ([ADR-0002](../adr/0002-pnpm-workspaces-como-monorepo.md));
framework HTTP → Fastify ([ADR-0003](../adr/0003-fastify-como-framework-http.md)); forma de los IDs
→ prefijo por entidad ([ADR-0004](../adr/0004-ids-de-dominio-con-prefijo.md)).

## Cómo correrlo

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # completar MONGODB_URI y BETTER_AUTH_SECRET
pnpm verify                              # lint + typecheck + test + build
pnpm dev                                 # API en :3000, web en :5173
```

## Última actualización

2026-09-17 — código de la Fase 0 completo. Ver [bitácora](./bitacora/2026-09-17-fase-0-fundaciones.md).
