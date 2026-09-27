# 2026-09-27 — Fase 4: qué le falta a la app para parecerse al diseño

- Autor: Claude Opus 5.5 (agente)
- Duración aprox: media

## Objetivo

Con F4-01 y F4-02 mergeadas, el usuario vio que la app no se parecía al diseño de `docs/design`:
componentes en otro lugar y con otro aspecto. Pidió analizar qué falta en el detalle de ejercicio
(la única pantalla diseñada), qué hace falta en el resto, y armar un plan de acción.

## Qué se hizo

- La app corriendo en local (API con Mongo efímero y Vite en 5174, con configuraciones temporales
  de `launch.json` que después se revirtieron), con el usuario admin del seed y un Back squat con
  marcas de 60, 80 y 100 kg, como el diseño. Capturas a 390px del detalle, Home, Estadísticas,
  Perfil, Nuevo ejercicio y Login, comparadas contra el HTML y el PNG del diseño.
- Causa raíz: F4-01 dejó bien la paleta y las fuentes, pero nadie las usa. Ningún componente
  consume `--wc-font-family-display` (medido: cero elementos con Staatliches), `.wc-plate-cut` no
  tiene usos, no hay `text-transform` ni `letter-spacing` en toda la app, y el detalle sigue la
  estructura de los mockups 5 y 6: número grande con barra arriba, botón lima, sin progreso y sin
  barra fija.
- Contraste medido de cada par de colores del diseño: dos no pasan AA (ver decisiones).
- Spec: §5 (header y ejercicio), §5.1 (la banda de carga sin barra de progreso), §5.2 nueva (la
  estructura del detalle, zona por zona) y §11 (columna de 430px, los dos colores accesibles, piso
  de tamaño de texto).
- `docs/ACTION-PLAN.md`: la Fase 4 replanificada. F4-03 se partió en tres, F4-04 en dos y F4-05 en
  cuatro; entró F4-12 (la spec); F4-08 subió de 3 a 5 puntos. Pasa de 11 tareas y 52 puntos a
  18 tareas y 75 puntos. Los restos del tema viejo que F4-02 no tocó (`theme_color` y
  `background_color` en `#24333d` en el manifest de la PWA) quedaron en F4-07.

## Decisiones tomadas

Todas propuestas por la IA y confirmadas por el usuario ("si, inicia"):

- **Banda de carga como tag en la barra fija, sin barra de progreso** — el diseño no tiene ninguna
  de las dos, y spec §5.1 pedía ambas; el porcentaje ya se lee en la grilla.
- **Editar con un lápiz al lado del nombre; "Ver estadísticas ›" debajo del progreso** — el diseño
  no los muestra y la spec los exige.
- **"‹ EJERCICIOS / {CATEGORÍA}" en lugar de "MOVIMIENTO / FUERZA"** — una PWA instalada en iOS no
  tiene botón atrás.
- **El botón de menú se mantiene**, cuadrado y con borde, aunque el header del diseño no lo tenga.
- **Sin abreviatura ni nombre traducido** ("SENTADILLA TRASERA" / "BACK SQ" del diseño): el
  catálogo dice "Back squat" y cambiarlo es un cambio de datos con migración, fuera de un rediseño.
  Debajo del nombre va "{NIVEL} // RM VIGENTE".
- **Dos colores se apartan del diseño para pasar AA**: el botón magenta con texto blanco daba
  4.19:1 y pasa a `#DD1964` (4.78:1); "RM ACTUAL" magenta sobre oliva daba 3.08:1 y pasa a
  `#F576A7` (4.95:1). Ningún texto por debajo de 10px, y el informativo desde 11px (el diseño usa
  9px).
- **Columna de 430px** en toda la app, la del diseño, en lugar de los 640px de hoy.
- **El aumento del progreso se calcula en `@wasabi-cross/schemas`**, no en el componente, y la
  cantidad de registros sale de `summary.records` de la estadística que ya existe: la API no
  cambia.

## Bloqueos / lo que no funcionó

- El navegador del panel dejó de recibir clicks a mitad de la sesión (la ventana quedó detrás), así
  que el menú lateral y la hoja de nueva marca se analizaron por código, sin captura.
- `main` local estaba 7 commits atrás: F4-02 ya se había mergeado (#57). La rama salió de
  `origin/main` y el plan se ajustó a eso (F4-02 ya había limpiado `index.html` y el bootstrap).

## Próximo paso

1. Revisar y mergear la PR de `docs/fase-4-gap-diseno` (spec §5.2 y Fase 4 replanificada). Con eso
   F4-12 queda hecha.
2. Seguir con F4-03a (tipografía, botones y tarjetas): es la base de todo lo demás.
