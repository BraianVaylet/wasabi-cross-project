# 2026-10-09 — F10-06: Registro y Funciones

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta

## Objetivo

F10-06: las secciones Registro y Funciones del diseño, en voseo, **prometiendo sólo lo que tiene Free**
(spec §4) y avisando qué parte de cada captura es de Pro.

## Qué se hizo

- `Registro` y `Funciones`, con su texto en `src/content/` y los estilos de sección que van a compartir
  las siguientes en `global.css`.
- Tests: dos reglas sobre el contenido (sin "tendencia" ni "evolución", y las estadísticas, siempre
  "de PRO"; los pies de las capturas que muestran Pro lo dicen) y el HTML de las dos secciones.
  147 → 166 en la landing, y trece mutaciones a mano.
- Revisión en Chromium (axe, títulos, nav, tamaños, carga lazy) a 390 y 1280 px.

## Decisiones tomadas

- **Los pies avisan, no se cambian las capturas.** El plan dejaba elegir con el usuario entre avisar o
  reemplazarlas por capturas de Free; reemplazarlas necesita el script que las regenere (fuera de la
  fase), así que se avisa y la alternativa queda como decisión abierta en STATE.
- **El pie del catálogo no lista las disciplinas.** El del diseño nombraba cinco y la captura muestra siete
  (también HYBRID y PILATES): una lista que contradice la imagen no la corrige nadie. El `alt` sí las
  nombra, porque describe lo que se ve.
- **El `alt` describe el progreso** (el gráfico y el aumento), aunque sea de Pro: es lo que se ve.
  El aviso va en el pie.
- **Cada sección es una región con nombre** (`aria-labelledby` apuntando a su h2), y las dos líneas del
  titular van en `<span>` de bloque en vez de un `<br>`.
- **Se mueve a `global.css`** lo que las secciones comparten: el aire de arriba y abajo, el titular
  (con el tracking de 0,04 em del diseño, que es la mitad del de los h2 de la app) y el párrafo.

## Bloqueos / lo que no funcionó

- **Lo que dice el plan sobre las capturas se quedaba corto.** Hablaba de 03 y 04; la 02 también
  muestra Pro, y el texto "Tendencia de fuerza" aparece **dentro de la imagen**: ningún test de texto
  lo ve. Se avisa en el pie y queda anotado.
- **El test de imágenes de F10-03 asumía una sola captura.** Comparaba cada WebP con el PNG de
  `01-home`; con la 03 (780×3120) habría fallado por el motivo equivocado. Ahora compara cada una con
  la suya.
- **Cinco errores de lint por un `Object.values` sobre una unión de dos `as const`**, que se degradaba
  a `any`: se tipó la forma común de las dos secciones.
- Mi script de revisión daba dos capturas "sin cargar" a 390 px: era el lazy loading y su temporización,
  no un defecto (se confirmó bajando de a una).

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): revisar la PR de F10-06 y
aprobar su copy; después, en paralelo, F10-07 a F10-09.
