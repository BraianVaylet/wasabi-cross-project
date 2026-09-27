# 2026-09-27 — F4-03a: tipografía, botones y tarjetas

- Autor: Claude Opus 5.5 (agente)
- Duración aprox: media

## Objetivo

Primera tarea de componentes de la Fase 4 replanificada (PR #60): que la app use de verdad lo que
F4-01 definió — Staatliches en los titulares, el recorte de esquina, las mayúsculas con tracking —
y sumar los colores y tamaños del diseño que faltaban.

## Qué se hizo

- `tokens.css`: colores nuevos (`--wc-text-soft`, `--wc-text-placeholder`, `--wc-divider`,
  `--wc-danger-on-subtle`, `--wc-cta` y su hover), cada uno con su contraste medido y documentado;
  escala chica fija (10, 11 y 12px, con el piso de spec §11) y titulares fluidos con los mínimos
  del diseño a 390px (24, 38 y 58px); tracking del diseño; `--wc-plate-shape` como la forma del
  recorte; `.wc-display` y `.wc-kicker`; y todos los `h1`–`h3` dentro de `.wc-root` en Staatliches,
  en mayúsculas, con especificidad cero.
- `Button`: Staatliches, mayúsculas, recorte, variante `cta` (magenta de spec §11, texto blanco).
  `ghost` pasa al par de colores de los porcentajes no elegidos del diseño.
- `Card`: `highlighted` se reemplaza por `variant` (`plain`, `current`, `past`), las dos del
  historial del diseño. No la usaba ninguna pantalla todavía.
- `IconButton` cuadrado y con borde; `Tag` en mayúsculas chicas.
- Stories nuevas: `Button/Variants`, `Button/Cta`, `Card/History` y `Fundaciones/Tipografía`.
- E2E: el flujo principal verifica que el título del detalle se pinta en Staatliches (jsdom no
  carga CSS: sólo el navegador real lo puede decir).
- Verificado en Storybook con el navegador: estilos computados, foco con Tab y axe (cargado a
  mano en cada story) sin violaciones ni contrastes incompletos. `pnpm verify` y `pnpm e2e` en
  verde; coverage de ui en 97.9%.

## Decisiones tomadas

- **El recorte va en el propio elemento, no en una capa `::before`.** La primera versión ponía
  fondo y borde en un `::before` recortado para que el outline del foco quedara entero. axe la
  delató: con el fondo en un pseudo-elemento deja el contraste como "incompleto"
  (`pseudoContent`), o sea sin verificar, y el axe del E2E es la red de contraste de spec §11. Con
  el fondo en el elemento, axe mide; como el recorte se come el outline, el foco pasa a ser un
  anillo interior (`box-shadow: inset`). En alto contraste de Windows se saca el recorte, así el
  outline del sistema queda entero.
- **Colores del anillo según el fondo**: lima en general; oscuro sobre el botón lima; blanco sobre
  la CTA (el lima sobre magenta da 2.98:1, por debajo del 3:1 de WCAG 1.4.11); claro sobre la
  tarjeta actual (pegado al borde lima, uno lima sólo engordaría el borde).
- **La CTA no lleva sombra.** El HTML del diseño le declara `4px 4px 0 #7B123D`, pero su propio
  `clip-path` la tapa: leídos los píxeles del PNG, no hay ni uno de ese color alrededor del
  botón. Se sigue lo que el diseño muestra, no lo que declara. F4-03a en `ACTION-PLAN.md` se
  ajustó con eso (sale `#7B123D` y "sombra" del criterio de aceptación; entra el del foco).

## Bloqueos / lo que no funcionó

- `pnpm verify` local falla en `format:check` por dos worktrees de otras sesiones en
  `.claude/worktrees/` (ignorados sólo en `.git/info/exclude`, no en `.prettierignore`). No está en
  el repo ni en CI; el chequeo se corrió aparte, excluyéndolos, y dio limpio.
- El navegador del panel pierde clicks y screenshots con la ventana oculta; el foco se probó con
  Tab y los estilos se leyeron por JavaScript.

## Próximo paso

1. Revisar y mergear la PR de F4-03a (`feat/f4-03a-tipografia-botones`).
2. Seguir con F4-03c (componentes nuevos: `SectionHeader`, `Measure`, `PercentTiles`,
   `BottomBar`), F4-03b (formularios) y F4-04b (el gráfico): los tres dependen sólo de F4-03a y
   destraban el detalle.
