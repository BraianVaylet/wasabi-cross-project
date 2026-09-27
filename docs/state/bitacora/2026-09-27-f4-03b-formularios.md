# 2026-09-27 — F4-03b: formularios y estados

- Autor: Claude Opus 5.5 (agente)
- Duración aprox: corta

## Objetivo

Llevar los campos de formulario al lenguaje del diseño: en el análisis de F4-12, "Nuevo ejercicio"
mostraba radios y casillas nativas grises y etiquetas distintas entre sí. Y hacer el campo del
"PORCENTAJE PERSONALIZADO" del detalle, que F4-05a necesita.

## Qué se hizo

- `styles/forms.css`, lo que comparten todos los campos y lo importa cada componente:
  `.wc-field-label` (12px, mayúsculas, `#9ACBC8`, en campos y leyendas por igual),
  `.wc-field-box`, `.wc-field-error`, `.wc-choice` (casilla y radio dibujados) y
  `.wc-choice-tile` (los casilleros de los grupos).
- `TextField`: la caja con el fondo de superficie, placeholder del diseño, y `variant="inline"`:
  una caja con el label a la izquierda y un campo corto a la derecha, subrayado en naranja con el
  "%" y el número en lima al escribir. El error queda afuera de la caja y se sigue anunciando.
- `TextArea` y `Select` con la misma etiqueta y la misma caja.
- `Checkbox`, `CheckboxGroup` y `RadioGroup`: casilla y radio dibujados; los dos grupos, en
  casilleros con recorte (el elegido en oliva con borde lima). La categoría queda de a dos por
  renglón.
- `Skeleton` con el violeta y la forma de las tarjetas del historial.
- Stories: `TextField/Inline` (con y sin error) y "Fundaciones/Formulario", todos los campos juntos
  como en "Nuevo ejercicio".
- Verificado en el navegador: las ocho etiquetas del formulario iguales (tamaño, peso, color); las
  ocho casillas y radios sin apariencia nativa; axe en el formulario y en cada story de error, 0
  violaciones y 0 contrastes sin verificar; con Tab, el outline del radio queda entero adentro
  del casillero, lejos de las esquinas cortadas. `pnpm verify` (ya sin el problema de los
  worktrees, #62) y `pnpm e2e` en verde; los axe del E2E cubren login, nuevo ejercicio y perfil con
  los campos nuevos.

## Decisiones tomadas

- **El radio es un cuadrado con otro cuadrado adentro, no un círculo**: el diseño no tiene una
  sola curva. Se distingue de la casilla por la marca (tilde vs. cuadrado) y por el grupo: un
  lector de pantalla lo anuncia como radio igual.
- **En alto contraste vuelven los controles nativos** (`appearance: auto`): el sistema pisa los
  colores de la marca dibujada y la casilla marcada no se distinguiría de la vacía.
- **El casillero elegido se pinta con `:has(:checked)`**: en un navegador sin `:has` (anteriores
  a fines de 2023) el casillero no se resalta, pero la casilla o el radio de adentro sí: el estado
  se sigue viendo.
- **Nada que cambiar en las pantallas**: los componentes mantienen su API (sólo se suma
  `variant` a `TextField`), así que "Nuevo ejercicio", el perfil y el login ya se ven con los
  campos nuevos. Su ajuste fino queda en F4-06, F4-08 y F4-09.

## Bloqueos / lo que no funcionó

Nada.

## Próximo paso

1. Revisar y mergear la PR de F4-03b (`feat/f4-03b-formularios`).
2. Seguir con F4-05a (el detalle: cabecera y carga, la primera pantalla con el diseño real) y
   F4-04b (el gráfico de progreso, que destraba F4-05c).
