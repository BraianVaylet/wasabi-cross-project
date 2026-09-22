# 2026-09-22 — F2-07 y F2-09: la pantalla de Estadísticas y sus accesos

- Autor: Claude Opus 5 (agente), con Braian
- Duración aprox: una sesión

## Objetivo

La pantalla del mockup 10: el acordeón de ejercicios con su evolución, y las dos formas de llegar a
ella (el menú y el detalle de un ejercicio).

## Qué se hizo

- `/estadisticas`: el acordeón, con el gráfico de F2-06 y los cuatro números del resumen.
- `exerciseStats` en el cliente de API, con su consulta y su caso en `api.test.ts`.
- "Estadísticas" en el menú del header (quedó afuera en F1-09) y en el detalle, que la spec §5 pide
  como acción de esa pantalla.

## Decisiones tomadas

- **Las dos tareas van juntas.** Sin los accesos, la pantalla no se alcanza desde ningún lado: en
  `main` sería una ruta que nadie puede abrir.
- **Se pide sólo la evolución del que está abierto.** En una lista de diez, nueve de esas consultas
  no las mira nadie. Cuál está abierto vive en la URL, como el porcentaje del detalle.
- **El acordeón es un `button` con `aria-expanded`**, no un div con click: Enter y Espacio andan
  solos porque es un botón de verdad.

## Bloqueos / lo que no funcionó

- **Encontrado al mirarla en el navegador**: el gráfico se dibujaba de 320 px dentro de una caja de
  192 y se comía los números. TanStack Charts calcula su alto solo si no se lo dan: ahora va
  explícito y la caja recorta.
- Cuatro pruebas inversas: pedir las estadísticas de todos, no guardar lo abierto en la URL, dejar
  `aria-expanded` fijo y sacar el enlace del detalle hacen fallar tests.
- Probado a mano en 375×812 contra la API real, con una serie de cuatro marcas.

## Próximo paso

F2-05 (los agregados generales por capacidad y grupo muscular), que es lo que falta para que F2-08
tenga qué mostrar.
