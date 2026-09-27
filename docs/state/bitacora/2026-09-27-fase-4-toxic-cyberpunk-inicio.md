# 2026-09-27 — Arranca la Fase 4: rediseño Toxic Cyberpunk

- Autor: Claude Sonnet 5 (agente)
- Duración aprox: larga

## Objetivo

Llegó un mockup nuevo (`docs/design/`) con un lenguaje visual completo, distinto del tema dark/light
actual. El usuario pidió adaptarlo y aplicarlo a toda la app, aunque sólo hay una pantalla diseñada
(detalle de ejercicio).

## Qué se hizo

- Antes de tocar código: dos preguntas al usuario (¿tema único o conviven con dark/light?, ¿seguir
  el flujo de CLAUDE.md de ADR + spec primero, o implementar y documentar después?). Eligió tema
  único y ADR + spec primero — la magnitud del cambio (retira todo el sistema dark/light, toca
  schemas/API además de UI) y que choca con proceso ya documentado ameritaba confirmar antes de
  empezar.
- **PR #55** (`docs/fase-4-toxic-cyberpunk-plan`): [ADR-0008](../../adr/0008-tema-unico-toxic-cyberpunk.md)
  (tema único, se retira el selector dark/light), spec §11 actualizada, y el backlog completo de la
  Fase 4 en `docs/ACTION-PLAN.md` — 11 tareas, 52 puntos, F4-01 a F4-11.
- **PR #56** (`feat/f4-01-fundaciones-tema`): F4-01, la primera tarea del backlog. `tokens.css`
  reescrito con la paleta única (fondo `#0F041C`, acento lima, magenta y naranja para las bandas de
  carga), tipografía Share Tech Mono + Staatliches vía Fontsource (reemplaza Space Grotesk), radios
  a 0 y la utilidad `.wc-plate-cut` (el recorte de esquina en diagonal del mockup). `pnpm verify`
  completo en verde; verificado a mano en Storybook (Button, Card, Tag, AppHeader) — paleta y
  fuentes correctas, axe sin violaciones.
- Se agregó `.claude/launch.json` (Storybook y `pnpm dev`) para poder verificar en el navegador de
  Claude Code, como pide CLAUDE.md para cambios de frontend.
- El usuario mergeó PR #55 y PR #56 durante la sesión. Se siguió con **F4-02**
  (`feat/f4-02-retirar-tema`, **PR #57**): `theme` sale de `userPreferencesSchema` (schemas), del
  endpoint de preferencias y de Mongo (migración `20260927120000-retirar-tema.ts`, reversible);
  `packages/ui/src/theme` y `ThemeToggle` se retiran; el header y el Perfil pierden el toggle;
  `index.html` pierde `theme-bootstrap.js` (ya no hace falta resolver el tema antes de pintar).
  E2E actualizado (tres specs ejercitaban el toggle) y verificado de punta a punta: `pnpm e2e` y
  `pnpm e2e:prod` en verde, coverage de los cuatro workspaces por encima de 90%.

## Decisiones tomadas

- **Tema único, no un tercer tema**: el mockup no tiene una variante clara y triplicar paletas no
  se justifica para un producto de un usuario y sus amigos (spec §12). Ver ADR-0008.
- **F4-01 no toca `theme.ts`/`ThemeToggle`/la preferencia persistida**: eso es F4-02, tarea aparte,
  para no mezclar un cambio de tokens CSS con uno de schema+API+migración en la misma PR.
- **Colores derivados donde el mockup no alcanza**: el magenta del mockup (`#EE1B6C`) pasa AA como
  texto chico pero raspando (4.6:1); se agregó `--wc-danger-text` un poco más claro (`#F23A80`,
  5.4:1) para tener margen real. Documentado en `tokens.css` con el mismo criterio que la versión
  anterior del archivo.
- **`--wc-accent-hover` es un valor derivado, no del mockup** (que es HTML estático sin estado
  hover) — a revisar si aparece un mockup con estados.
- **El bug de `ExerciseDetailPage` se arregla en el mismo PR de F4-02, no aparte**: F4-02 lo
  destapó (al sacar `useSyncedTheme` del shell, se perdió el prefetch accidental de preferencias
  que lo tapaba), y queda dentro del "arreglar lo que se rompe al tocar el archivo" en vez de una
  tarea nueva — es una línea, en el archivo que la propia tarea ya toca.
- **No se mezcla el arreglo del lint pre-existente (`no-unsafe-*` en varios `onChange`, y el
  worktree viejo que ensucia `eslint .`) en esta PR**: ninguno de los dos lo causó F4-02
  (confirmado con `git stash` contra `main`), y mezclarlo hubiera inflado el diff con algo sin
  relación. Quedaron como tareas aparte (chips de sesión).

## Bloqueos / lo que no funcionó

Nada de código. Sí una sorpresa de entorno: `pnpm lint` local falla por dos motivos ajenos a esta
tarea — un worktree viejo de Claude Code (`.claude/worktrees/interesting-merkle-fb4716`) que
`eslint.config.js` no ignora, y ~70 errores `no-unsafe-*` pre-existentes en `apps/web` que `tsc` no
reproduce. Confirmado con `git stash` que los dos existen igual en `main`, sin tocar nada de esta
sesión. La CI de GitHub Actions corre limpia (PR #57 en verde), así que es algo del entorno local,
no del código — quedó como tarea aparte para entender la diferencia.

## Próximo paso

1. Usuario revisa y mergea PR #57 (F4-02).
2. Seguir con **F4-03/F4-04** (componentes Cross: botones, inputs, navegación, el gráfico), no
   dependen de F4-02.
3. Fase 3 sigue igual, bloqueada en F3-07/F3-08 (sin relación con esto, puede avanzar en paralelo).
