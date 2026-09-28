# 2026-09-28 — Elegir un precargado desde la UI (F5-10, primer corte)

- Autor: Claude Sonnet 5.5
- Duración aprox: 1 h

## Objetivo

Los precargados estaban en la base pero la app sólo los ofrecía como `<datalist>` sobre el campo
Nombre: había que saber cómo se llamaban. Se pidió poder elegirlos desde la UI, con un primer
corte chico y seguir después con el diseño completo de la Fase 5.

## Qué se hizo

- `/ejercicios/nuevo` se arma sobre `Tabs` (F5-09) con la pestaña en la URL (`?modo=catalogo|crear`;
  sin `modo`, abre el catálogo).
- Pestaña "Catálogo": buscador (sin mayúsculas ni acentos) y una tarjeta por ejercicio con
  categoría, grupo primario y equipo. Los que el usuario ya tiene salen sin poder elegirse, con el
  motivo. Elegir uno carga el nombre en el formulario y pasa a "Crear".
- `CATEGORY_LABEL` sube a `lib/labels.ts`, compartida con el detalle.
- Tests de componente y de accesibilidad; los E2E entran por `?modo=crear` y el axe audita las dos
  pestañas.

## Decisiones tomadas

- El filtro es en memoria sobre el catálogo ya cargado — el catálogo son decenas de entradas. F5-10
  completo lo pasa a `GET /exercises/catalog?q=&discipline=` cuando llegue F5-07.
- "Ya lo tenés" sale de la lista de Home (`exerciseId`), sin esperar a que la API lo marque (F5-07).
- Elegir escribe el nombre y reusa `catalogMatch` del formulario actual: F5-11 lo reemplaza por el
  formulario de la definición editable.

## Bloqueos / lo que no funcionó

- Los E2E y el axe de Playwright no se corrieron en local; los corre CI.
- El `<datalist>` sigue en "Crear" hasta F5-11.

## Próximo paso

Sigue lo pendiente de la Fase 5: F5-07 (API con disciplina y "ya agregado"), F5-11 ("Crear" con
grupo primario y secundarios) y F5-10 completo (filtros y formulario editable).
