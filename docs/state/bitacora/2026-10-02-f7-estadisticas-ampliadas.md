# 2026-10-02 — Fase 7: estadísticas ampliadas

- Autor: Claude (Opus 5.5), con Braian
- Duración aprox: una sesión larga

## Objetivo

El usuario pidió, en Estadísticas, gráficos de torta o dona con la proporción de disciplinas que
practica según los ejercicios cargados, los grupos musculares más trabajados contando primario y
secundarios, y que se evaluara qué otras métricas le sirven a un atleta.

## Qué se hizo

- **Evaluación de métricas** con lo que ya guarda el modelo (sin pedir datos nuevos). Se
  propusieron cuatro y el usuario eligió las cuatro: categoría y segmento, constancia (marcas por
  mes, días desde la última), récords del período (mejores marcas nuevas, los tres que más
  mejoraron) y ejercicios para retestear. Quedaron afuera, sin proponer como tarea: equipo más
  usado, nivel, "con dolor" y la relación con el peso corporal (que el modelo no tiene).
- **F7-00**: spec §5.4 (nueva) y la Fase 7 en el backlog, 8 tareas y 23 puntos.
- **F7-01** `GET /stats/breakdown` y **F7-02** `GET /stats/activity`, con el cálculo puro en el
  dominio de `stats`, el reloj inyectado y tests contra `mongodb-memory-server`.
- **F7-03** `Donut`, **F7-04** `RankBars` y `ColumnChart` en `@wasabi-cross/ui`, con stories y axe.
- **F7-05** y **F7-06**: las secciones en la pantalla; **F7-07**: E2E con axe a 390px.

## Decisiones tomadas

- **Disciplina: cuenta entera en cada ejercicio que la tiene** (decisión del usuario, sobre
  repartir ½ y ½): el porcentaje es sobre menciones, y el centro de la dona lo dice.
- **Grupos: primario 1, secundario ½** (decisión del usuario). Catorce grupos no se leen en una
  torta: van en barras horizontales con los dos tramos.
- A lo sumo **seis porciones** por dona; con más, cinco y "Otras". Lo dice la skill dataviz y
  coincide con la paleta: seis colores validados.
- **Paleta de gráficos validada** (`--wc-chart-*`): el lima del acento y los neones del tema
  quedan fuera de la banda de luminosidad para porciones; se usaron sus versiones más apagadas,
  en un orden que pasa la separación para daltonismo también entre la última y la primera
  (la dona cierra). El gris de "Otras" queda en 7,7 con el magenta bajo protanopía: legal porque
  hay hueco entre porciones y nombre escrito.
- Mejor marca nueva: supera a **todas** las anteriores, también las de antes del período; la
  primera y el empate no cuentan, igual que la mejor marca del detalle.
- Para retestear: **más de 8 semanas** sin marca. Default sin consulta explícita, en la spec para
  revisar en la PR.
- `breakdown` y no `composition` en la API, por la raíz de composición.

## Bloqueos / lo que no funcionó

- El árbol del checkout principal tenía cambios sin commitear de otra sesión (F6-01 y el logo):
  todo se hizo en un worktree aparte desde `origin/main`.
- `main` estaba en rojo desde el bump de dependabot (#87): dos versiones de mongodb rompían
  `tsc`. Se arregló con un `pnpm dedupe`, pero mientras tanto #90 llevó el mismo arreglo a `main`
  (y renombró Gimnasio a Musculación): la rama se rehízo sobre `main` sin ese commit.
- El pane de preview sólo lee el `launch.json` del checkout principal: Storybook del worktree se
  levantó a mano en el puerto 6016.
- A 375px la leyenda de la dona no entraba en una fila (nombre, cantidad y porcentaje): la
  cantidad pasó debajo del nombre.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar y mergear la PR de la
Fase 7, cumplir el Definition of Done y crear las tarjetas con `/trello-sync`.
