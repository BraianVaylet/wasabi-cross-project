# 2026-10-04 — F10-01: el workspace de la landing con Astro

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta

## Objetivo

F10-01: el workspace `apps/landing` con Astro 7, con el tooling del monorepo (ESLint, Prettier,
TypeScript, Vitest) funcionando y `pnpm verify` en verde.

## Qué se hizo

- `apps/landing` (`@wasabi-cross/landing`): Astro 7.3.5 estático, `inlineStylesheets: 'never'`,
  tsconfig sobre `astro/tsconfigs/strictest`, una `index.astro` mínima y un test de build real.
- `astro` y `@astrojs/check` al `catalog:`; `eslint-plugin-astro` (con `eslint-plugin-jsx-a11y-x`) y
  `prettier-plugin-astro` en la raíz; `.astro/` ignorado por git, Prettier y ESLint.
- CLAUDE.md y AGENT.md con el workspace nuevo y los comandos; AGENT.md quedó igual a CLAUDE.md (le
  faltaba la fila de `seed:admin`).
- `pnpm verify` completo, `pnpm audit --audit-level high` y el coverage de la landing, en verde.

## Decisiones tomadas

- **El test de build corre la CLI de Astro en otro proceso**, no `import { build } from 'astro'`:
  dentro de Vitest con `getViteConfig` la API programática no devuelve `build`.
- **`pnpm dev` de la raíz excluye la landing** (`--filter "!@wasabi-cross/landing"`): CLAUDE.md dice
  que levanta API y web, y un tercer servidor en el 4321 no es lo esperado.
- **Excepción a `minimumReleaseAge` para `http-cache-semantics@4.3.0`**, decidida por el usuario entre
  tres opciones (esperar un día, excluirla, ignorar el advisory). El job `audit` del CI habría
  fallado por GHSA-ch52-4w7c-c8xp, que entra por `astro`. Se verificó que el publicador es el mismo
  que el de la 4.2.0 y que la versión está firmada; un `overrides` la fuerza.
- **`astro-eslint-parser` no soporta `projectService`**: los `.astro` piden `project: true`, que es
  lo que haría solo, pero sin el aviso en cada corrida.
- **Sin telemetría apagada.** Astro 7 trae `@astrojs/telemetry`: manda datos anónimos en builds
  locales (no en CI, por `ci-info`). Se apaga con `ASTRO_TELEMETRY_DISABLED=1`. No se tocó.

## Bloqueos / lo que no funcionó

- **Mi verificación de formato de la sesión anterior era un falso OK** (Prettier desde la raíz
  salta `.claude/worktrees`). Esta vez todo se corrió con el cwd dentro del worktree.
- **`pnpm audit` falló** con el workspace nuevo y no lo habría visto `pnpm verify`: sólo el CI lo corre.
- `vitest.config.ts` no tipaba la clave `test` hasta agregar `/// <reference types="vitest/config" />`.
- El coverage de la landing da 0/0 (no hay `.ts` en `src/` todavía): el umbral de 90% empieza a
  valer con F10-03.

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): revisar la PR de F10-01;
después F10-02 (tokens y fuentes).
