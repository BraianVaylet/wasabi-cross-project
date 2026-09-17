# ADR-0002: pnpm workspaces como herramienta de monorepo

- Fecha: 2026-09-17
- Estado: aceptada

## Contexto
La documentación asumía pnpm sin haberlo confirmado ([STATE.md](../state/STATE.md) lo listaba como
decisión abierta). F0-01 pide cuatro workspaces (`apps/web`, `apps/api`, `packages/schemas`,
`packages/ui`) que "resuelvan sin duplicar dependencias". El equipo es de una persona: cualquier
herramienta que haya que mantener tiene que ganarse el lugar.

## Opciones consideradas
1. **npm workspaces** — cero instalación extra. Hoisting plano: dos workspaces pueden terminar con
   versiones distintas de la misma librería y nadie se entera hasta que rompe en runtime. No tiene
   catálogo de versiones.
2. **pnpm workspaces** — `node_modules` no plano (si un paquete usa algo, lo declara), store
   compartida, y `catalog:` para fijar una única versión de cada dependencia compartida en
   `pnpm-workspace.yaml`.
3. **Turborepo sobre pnpm** — lo de pnpm más orquestación de tareas con cache.

## Decisión
Opción 2: **pnpm workspaces con catálogo**. El criterio de aceptación de F0-01 ("sin duplicar
dependencias") pasa de ser una convención a algo verificable: las versiones compartidas viven en
`catalog:` y un workspace que quiera otra versión tiene que escribirla explícitamente.

Turborepo (opción 3) se descarta por YAGNI (spec §8): con cuatro workspaces, `pnpm -r` alcanza. El
disparador para reconsiderarlo es que el CI tarde lo suficiente como para molestar, no la estética.

## Consecuencias
- Quien clone el repo necesita pnpm ≥ 11 (queda fijado en `packageManager` y `engines`).
- `shamefully-hoist=false`: una dependencia no declarada rompe en desarrollo, no en producción.
- `onlyBuiltDependencies` limita qué paquetes pueden correr scripts de postinstall (hoy: `esbuild`,
  `mongodb-memory-server`). Una dependencia nueva que necesite build hay que autorizarla a mano —
  es fricción a propósito (spec §13).
- **TypeScript queda en 5.9.3, no en 7.x.** TS 7 ya salió, pero `typescript-eslint@8` declara
  `typescript >=4.8.4 <6.1.0` como peer: subir hoy deja al monorepo sin lint con tipos, que es
  justo lo que sostiene la prohibición de `any`. Revisar cuando typescript-eslint soporte TS 7.
