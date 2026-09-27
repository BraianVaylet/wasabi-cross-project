# 2026-09-27 — F4-04b: el gráfico de progreso

- Autor: Claude Opus 5.5 (agente)
- Duración aprox: media

## Objetivo

Que `Chart` sea el "PROGRESO DEL RM" del diseño: caja recortada con su encabezado, grilla
punteada, eje, el valor de cada punto y su fecha. Lo necesita el detalle (F4-05c) y lo usa ya
Estadísticas.

## Qué se hizo

- Primero se miró si TanStack Charts alcanzaba (la tarea pedía consultar antes de salirse del
  stack, spec §6): tiene marcas `text` con desplazamiento y anclaje, grilla con `strokeDasharray`
  y ticks con valores y formato explícitos. Alcanza.
- `Chart`: la caja con recorte y borde violeta; el encabezado "RM REGISTRADO / UNIDAD: KG" (el
  nombre accesible sigue siendo sólo el título); tres líneas de grilla punteadas (la marca más
  baja, la más alta y el medio), el eje en el verde azulado; los puntos huecos y el último lleno;
  el valor arriba de cada punto (el actual en lima) y la fecha abajo, en la mono del cuerpo; 104px
  de alto. Nueva prop `formatValue` para escribir cada valor (en el dibujo y en la tabla).
- Estadísticas le pasa el formato de la app (`formatMark`): un tiempo se lee 4:32 y no 272 s, y
  los decimales van con coma. Test nuevo en `stats.test.tsx`.
- Stories: el caso del diseño (60/80/100), una, dos y doce marcas, y un tiempo.
- Verificado en el navegador, en las cinco stories: ninguna etiqueta se pisa con otra ni se sale
  de la caja (medido con las cajas de cada texto), fuente y colores del diseño. `pnpm verify` y
  `pnpm e2e` en verde; `Chart` al 100% de líneas.

## Decisiones tomadas

- **Con más de cinco marcas, sólo la última lleva su valor**, y las etiquetas de las puntas se
  anclan hacia adentro. Con doce, la etiqueta del primero quedaba encima de la curva; el valor de
  cada marca está en la tabla, y el aumento en el encabezado de la sección (F4-05c). Las fechas
  las adelgaza la librería, siempre dejando las puntas.
- **Las fechas van a opacidad 1.** La librería apaga las etiquetas del eje al 68% por default: así
  el `#9ACBC8` del diseño bajaba de 10.7:1 a 5.4:1 y se veía más gris que en el PNG.
- **El contraste de los textos del dibujo lo garantizan los tokens, no axe.** axe no mide texto
  dentro de un SVG (lo deja "incompleto", `imgNode`): no es una violación, pero tampoco una
  verificación. Quedó documentado en el componente con cada valor medido sobre `--wc-surface`.
- **STATE.md no se toca en esta PR**: #64 (F4-03b) lo modifica en las mismas líneas y sigue
  abierta. Se actualiza en la próxima tarea, con las dos mergeadas.

## Bloqueos / lo que no funcionó

Nada.

## Próximo paso

1. Revisar y mergear #64 (F4-03b) y la PR de F4-04b (`feat/f4-04b-grafico-progreso`).
2. Seguir con F4-05a (el detalle: cabecera y carga), que con F4-03b queda destrabada, y después
   F4-05c (el progreso), que usa este gráfico.
