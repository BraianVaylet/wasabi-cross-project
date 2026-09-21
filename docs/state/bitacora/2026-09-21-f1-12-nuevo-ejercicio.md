# 2026-09-21 — F1-12: nuevo ejercicio

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

El formulario del mockup 9: elegir uno del catálogo o crear uno propio, con su primera marca,
nivel, comentarios y "con dolor".

## Qué se hizo

- **El nombre busca en el catálogo** con un `datalist`: las sugerencias del navegador se operan
  enteras con el teclado y no hay que inventar un combobox accesible.
- Si el nombre es uno del catálogo, **la categoría queda fija** (se muestra, no se elige) y el campo
  de la marca se adapta: "RM (kg)", "Repeticiones" o "Tiempo (mm:ss)". Si no está, aparecen las
  categorías.
- **El tiempo se escribe `mm:ss` y viaja en segundos**; `parseDuration` acepta también segundos
  sueltos y rechaza lo que no es un tiempo (`4:72`).
- **La lógica del formulario vive aparte de la pantalla** (`new-exercise/form.ts`): qué se valida y
  qué viaja a la API se prueban sin renderizar nada.
- Cuatro Componentes Cross nuevos, con tests y stories: `Select`, `TextArea`, `Checkbox` y
  `RadioGroup`.
- La **normalización de nombres** pasó de `apps/api` a `@wasabi-cross/schemas`: el front la necesita
  para reconocer un ejercicio del catálogo, y es la misma regla que usa la API (ADR-0006).

## Decisiones tomadas

- **La fecha se manda al mediodía** de la zona del usuario. A medianoche, un huso negativo la
  correría al día anterior: el ejercicio quedaría con fecha de ayer.
- **El campo de fecha es el nativo** (`type="date"`), con `max` en hoy. Es accesible, ya viene en
  es-AR y con la semana como la configuró el sistema; un calendario propio es una pantalla entera y
  no está pedido.
- **El `datalist` en vez de un combobox propio.** Menos control visual, pero es teclado y lector de
  pantalla gratis, y el criterio pide justamente eso.
- **Los errores de la API se muestran con su mensaje**, que ya viene explicado desde el servidor
  (el límite del plan dice cuántos y de qué plan).

## Bloqueos / lo que no funcionó

- **Una prueba inversa no fue detectada y destapó algo real**: quitar la invalidación de la lista
  después de guardar no rompía ningún test… porque Home volvía a pedir la lista en **cada visita**.
  Se le puso caché de 5 minutos a la lista (ya no se pide de más) y el test pasó a recorrer el
  camino real —Home, agregar, volver—, donde la invalidación sí es la que hace aparecer el
  ejercicio nuevo. Con eso, las siete pruebas inversas quedan detectadas.
- **Un test era frágil por zona horaria**: comprobaba el día con `getDate()`, que depende del huso
  de la máquina. Ahora compara la fecha ya formateada, que es lo que ve el usuario.
- **`lint:fix` y las reglas de tipos volvieron a pelearse** con `expect.objectContaining` anidado
  (devuelve `any`): se reemplazó por una aserción directa sobre la llamada, que además dice mejor
  qué se espera.
- **Probado a mano contra la API real**: alta desde el catálogo (categoría fija, "RM (kg)"), alta de
  tiempo escrita `4:32` que vuelve como `4:32` en Home, y la vuelta a la lista con el ejercicio ya
  agregado.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): mergear #17 (F1-07) y la PR de F1-12.
Sigue F1-13, el detalle del ejercicio con la tabla de porcentajes.
