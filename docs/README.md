# Documentación — Wasabi Cross

- [Spec de producto](./spec/wasabi-cross.spec.md) — fuente de verdad de qué se construye.
- [Arquitectura técnica](./architecture.md) — estructura de carpetas, módulos, logs, API.
- [Diccionario de códigos de error](./error-codes.md) — vivo, se actualiza con cada error nuevo.
- [Plan de acción](./ACTION-PLAN.md) — backlog vivo de tareas chicas, espejo del [tablero de Trello](https://trello.com/b/pK3RPkCT/wasabi-cross).
- [ADRs](./adr) — decisiones de arquitectura, una por archivo.
- [Estado del proyecto](./state/STATE.md) — foto del presente, leer al empezar cada sesión.
- [Bitácora](./state/bitacora) — historial de sesiones de trabajo.
- [Mockups](./mockup) — diseño de referencia.

## Cómo correr el proyecto

Comandos verificados en [CLAUDE.md](../CLAUDE.md#comandos). Lo mínimo:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm verify   # lint + typecheck + test + build, lo mismo que corre CI
pnpm dev      # API en :3000, web en :5173
```
