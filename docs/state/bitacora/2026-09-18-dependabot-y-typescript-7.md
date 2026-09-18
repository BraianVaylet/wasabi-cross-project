# 2026-09-18 — Dependabot, TypeScript 7 y reglas de actualización

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: sesión corta

## Objetivo

Revisar las PRs que Dependabot abrió después del merge de la Fase 0, en particular la #5, que subía
TypeScript a 7 — justo lo que [ADR-0002](../../adr/0002-pnpm-workspaces-como-monorepo.md) había
dejado bloqueado.

## Qué se hizo

- **Revisión de la PR #5** (`typescript` 5.9.3 → 7.0.2 y `@types/node` 24 → 26). Veredicto: no
  mergear. Braian la cerró.
- **Prueba de TS 7 en un worktree aparte**, en vez de deducir del changelog. Resultado:

  |           | TS 7.0.2                                                         |
  | --------- | ---------------------------------------------------------------- |
  | build     | ✅                                                               |
  | typecheck | ✅                                                               |
  | 208 tests | ✅                                                               |
  | lint      | ❌ `typescript-eslint does not support TS 7.0` — muere al cargar |

  El bloqueo es de una sola herramienta, pero es la que sostiene la prohibición de `any`.

- **PRs #2, #3 y #4** (actions de GitHub): ya estaban mergeadas al retomar. Se verificó que `main`
  siguiera verde con `checkout@v7`, `setup-node@v7` y `pnpm/action-setup@v6`.
- **PR #7**: reglas nuevas en `.github/dependabot.yml`.

## Decisiones tomadas

- **Ignorar `typescript >=6.1.0`, no todos los majors.** Es el mismo rango que el peer de
  typescript-eslint (`<6.1.0`). TS 6.0.x es compatible y puede llegar como PR. Cuando typescript-eslint
  amplíe el peer (seguimiento en typescript-eslint/typescript-eslint#10940, apunta a TS ≥7.1), se
  amplía la regla.
- **Ignorar majors de `@types/node`.** Los tipos siguen al Node que corremos (`.nvmrc` = 24).
  Adelantarlos deja compilar APIs que en runtime no existen.
- **Agrupar por tipo de update, no por tipo de dependencia.** Dependabot clasifica lo que viene del
  `catalog:` de pnpm como "production" aunque esté en devDependencies; así la #5 mezcló un bump
  inocuo con uno que rompe, y no se podía mergear uno sin el otro.
- **Actions en una sola PR.** Las tres por separado dispararon cuatro corridas en `main` que se
  cancelaron entre ellas.

## Bloqueos / lo que no funcionó

- **Cerrar la PR #5 no alcanzaba.** El propio Dependabot lo avisa: cerrar una PR de grupo no ignora
  esas versiones en PRs futuras. Sin la regla, TS 7 volvía la semana siguiente.
- **Bug de Dependabot con catálogos de pnpm.** En la #5 reescribió el specifier del importer raíz de
  `catalog:` a `7.0.2` literal, y CI murió con `ERR_PNPM_OUTDATED_LOCKFILE` antes de llegar al lint.
  No se arregla por configuración; queda anotado en `dependabot.yml` cómo destrabarlo.
- **Corrección a la [entrada anterior](./2026-09-17-fase-0-fundaciones-2.md).** Ahí se atribuyó el
  silencio de los monitores de CI a un `|| echo '[]'` que tapaba el código de salida de
  `gh pr checks`. **Era falso.** La causa real: `jq` no está instalado en esta máquina. Los cuatro
  loops de espera usaban `jq` suelto, que fallaba siempre con 127, así que la condición de salida
  nunca se cumplía. Los comandos que sí funcionaban usaban `gh ... --jq`, que trae su propio jq. La
  entrada anterior no se edita porque la bitácora es append-only; la corrección vive acá.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): escribir la Fase 1 en el plan de
acción, y nombrar las etiquetas de Trello para cerrar F0-08.
