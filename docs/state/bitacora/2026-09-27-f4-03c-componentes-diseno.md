# 2026-09-27 — F4-03c: los componentes nuevos del diseño

- Autor: Claude Opus 5.5 (agente)
- Duración aprox: media

## Objetivo

Las piezas del detalle del diseño que no existían como Componente Cross: el encabezado de
sección, el número con su unidad, la grilla de porcentajes y la barra fija de abajo. Son la base de
F4-05a–d (la pantalla).

## Qué se hizo

- `SectionHeader`: título en la condensada, dato chico a la derecha, etiqueta opcional arriba
  (fuera del nombre del título) y la línea de abajo, que se puede sacar ("PROGRESO DEL RM").
- `Measure`: número grande con la unidad chica, en cuatro tamaños del diseño (20, 30, 38 y 58px) y
  dos tonos. La unidad va en minúscula en el DOM y en mayúscula en pantalla: el lector de pantalla
  lee "kg" y no "K G".
- `PercentTiles`: un `fieldset` con radios reales y la leyenda visualmente oculta. Las flechas del
  teclado cambian de casillero sin código propio, y cada radio se anuncia "65% · 65 kg". El
  elegido y el foco se dibujan desde el radio (`:checked + cara`, `:focus-visible + cara`), no
  desde una clase: lo que se ve es siempre lo que el radio dice. Mantiene el nombre accesible que
  ya usa el E2E del detalle.
- `BottomBar`: fija abajo, de borde a borde, con el contenido en la columna de 430px y el
  `safe-area` del iPhone. Deja en su lugar un espacio del mismo alto, medido con
  `ResizeObserver`; sin él, un alto por default en el CSS.
- `tokens.css`: `--wc-column-max` (430px) y `--wc-column-gutter` (20px), que va a usar también el
  shell en F4-07, y `.wc-visually-hidden`.
- Stories de cada componente, y "Fundaciones/Detalle del diseño": el detalle armado con todas las
  piezas que ya existen, estático, para compararlo con el PNG a 390px. Lo que todavía falta (el
  gráfico, el campo del porcentaje) queda marcado ahí mismo.
- Verificado en el navegador: el detalle compuesto se ve como el PNG; axe en cada story, 0
  violaciones y 0 contrastes sin verificar (46 nodos medidos en el detalle); las flechas mueven la
  selección de la grilla; el último renglón de una página larga queda 33px por encima de la barra.
  `pnpm build`, lint, typecheck, 838 tests y `pnpm e2e` en verde; coverage de ui en 98.3%.

## Decisiones tomadas

- **La barra es una región (`<section aria-label>`), no un `<aside>`** como en el HTML del
  diseño: lo que tiene (la carga calculada y la acción principal) es parte del contenido de la
  pantalla, no un complemento.
- **El espacio reservado se mide, no se fija.** El diseño deja 220px de relleno abajo a ojo; acá
  el alto real de la barra cambia con la fuente o con un texto de dos líneas, y un número fijo o
  tapa o sobra.
- **`Measure` es `inline-block`.** Con un interlineado de 0.92, una caja `inline` de 58px se sale
  por arriba y tapa lo de encima: axe dejaba sin medir el contraste de la etiqueta de arriba
  (`bgOverlap`). Mismo arreglo en la story de Tipografía de F4-03a, que armaba el número a mano.
- **La story del detalle no calcula nada**: ni la carga ni la banda. Esas reglas viven en
  `@wasabi-cross/schemas` (ADR-0006) y las aplica la pantalla; en `packages/ui` no entra lógica
  de negocio (CLAUDE.md), tampoco en una story.

## Bloqueos / lo que no funcionó

- Con el panel del navegador oculto no hay ciclo de render, y `ResizeObserver` no entrega: el
  espacio reservado se quedaba en el alto por default. Una captura fuerza el render y ahí midió
  bien (129px, igual a la barra). No es un problema de la app: en una pestaña visible siempre
  renderiza.

## Próximo paso

1. Revisar y mergear la PR de F4-03c (`feat/f4-03c-componentes-diseno`).
2. Seguir con F4-03b (formularios: el porcentaje personalizado del detalle) y F4-04b (el gráfico
   de progreso): con esas dos y F4-03c, el detalle (F4-05a) queda destrabado.
