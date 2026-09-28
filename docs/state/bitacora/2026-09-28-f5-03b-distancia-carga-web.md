# 2026-09-28 — Distancia con carga en la web (F5-03b)

- Autor: Claude Sonnet 5.5
- Duración aprox: 20 min

## Objetivo

Que la web maneje la sexta categoría, distancia con carga, igual que cardio pero con el peso como
dato extra ("50 m · 152 kg").

## Qué se hizo

- El alta ofrece la categoría "Distancia con carga (metros y peso)" y pide la distancia y el peso
  de la primera marca. Era lo único que faltaba en el código: F5-03a ya había dejado el modal, el
  detalle, Home y el historial genéricos sobre `MeasureKind` y `extraFieldFor`.
- Tests de lo que el criterio pide: detalle (como cardio, sin porcentajes, con la mejor marca en la
  barra), Home, modal de marca nueva (pide y manda el peso), historial (el peso de cada marca) y el
  formulario del alta.

## Decisiones tomadas

- Sin cambios en `format.ts` ni en el detalle: `formatMark` y `markParts` ya escriben el peso
  cuando la marca lo trae, y el texto de "sin tabla de porcentajes" ya habla de distancia en
  general.

## Bloqueos / lo que no funcionó

- Ninguno.

## Próximo paso

F5-06 y F5-07 cuando se mergee F5-05; después F5-11 (pestaña "Crear") y F5-10 completo.
