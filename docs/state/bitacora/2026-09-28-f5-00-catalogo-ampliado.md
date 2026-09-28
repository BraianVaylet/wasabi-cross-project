# 2026-09-28 — F5-00: se planifica el catálogo ampliado

- Autor: Claude Opus 5.5 (Claude Code), con Braian
- Duración aprox: 1 h

## Objetivo

El usuario trajo un catálogo de 61 ejercicios en JSON y pidió: cargarlos en la base, poder elegirlos
al agregar un ejercicio, separar en dos pestañas de `/ejercicios/nuevo` la elección de un
precargado y la creación de uno propio, que elegir uno precargue todo (editable), y adaptar lógica
y UI a los datos. Primero, un análisis y un plan de acción.

## Qué se hizo

- Análisis del JSON contra el modelo actual. El catálogo ya existía (33 ejercicios, seed
  idempotente por nombre, `GET /exercises/catalog`), y el alta decidía catálogo o propio por el
  nombre escrito, con la definición del precargado fija.
- Diferencias encontradas: una categoría nueva (cardio), la capacidad potencia, dos grupos
  musculares nuevos, grupo primario y secundarios, disciplinas y equipo, Epley en hipertrofia
  contra la tabla de repeticiones de la spec, el segmento del cuerpo que con los secundarios daría
  "cuerpo completo" casi siempre, y renombres y cambios de categoría sobre el catálogo viejo.
  Campos derivables de la categoría en los 61 (campos registrables, % del RM, referencia,
  fórmula): consistentes, no hace falta guardarlos.
- Problemas de datos señalados y resueltos por el usuario (ver decisiones).
- Spec §3, §5, §5.1, §5.2 y §5.3 (nueva) actualizadas; ADR-0009; Fase 5 en el ACTION-PLAN
  (15 tareas, 59 puntos); STATE.md.
- Remote Control activado a pedido del usuario, para seguir desde el celular.

## Decisiones tomadas

- Un precargado con la definición editada se guarda como propio y cuenta para el límite del plan —
  sin definiciones por usuario que resolver en detalle y Estadísticas.
- Hipertrofia con RM estimado (Epley), tabla en kg — lo pedían los datos. Mejor marca = mayor RM
  estimado (decisión de la IA, para revisar en la PR: es la única forma de comparar 10 × 80 con
  6 × 90).
- Cardio: metros de valor principal, calorías de dato extra.
- Catálogo viejo: reemplazo de cero — no hay producción. El `down` de la migración no devuelve los
  gestionados ni las marcas borrados; queda dicho en ADR-0009.
- Sled Pull: espalda sólo como primario.
- Sled Push, Sled Pull y Farmers Carry: las de repeticiones pasan a funcional; se crean versiones
  de Hyrox en metros, en una categoría nueva, distancia con carga (metros + peso).
- Running: sólo ejercicios de distancia única. Salen Trote Z2, Series, Fartlek, Tempo Run,
  Cuestas, Long Run y Trail; entran carreras de 100 m, 400 m, 1 km, 5 km y 10 km.
- Wall Ball, Crunch, Medicine Ball Slam y Kettlebell Swing pasan a gimnástico: peso fijo o
  corporal, un RM estimado no dice nada.
- Defaults de la IA sin objeción del usuario: segmento derivado del grupo primario, espalda baja
  en core y trapecio en tren superior, `bilateral` no se importa, gimnástico conserva la tabla de
  repeticiones, el dato extra de las categorías nuevas siempre se carga.
- Se retira `WC-EXO-409-004`: un precargado editado conserva el nombre del catálogo, y en "Crear"
  la coincidencia sólo se avisa.

## Bloqueos / lo que no funcionó

- Un heredoc largo con el backlog falló en el Bash de Windows ("unexpected EOF") sin escribir
  nada; se agregó con Edit.

## Próximo paso

Revisar y mergear la PR de F5-00 (spec, ADR-0009 y Fase 5 en el backlog) y sincronizar Trello
(`/trello-sync`). Después arranca F5-01; F5-04 (Epley) y F5-09 (pestañas) pueden ir en paralelo.
