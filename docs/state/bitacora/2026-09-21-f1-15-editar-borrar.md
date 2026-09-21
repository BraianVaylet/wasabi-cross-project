# 2026-09-21 — F1-15: editar y borrar un ejercicio

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

Desde el lápiz del detalle: cambiar nivel, "con dolor", comentarios y —si es propio— el nombre; y
borrar el ejercicio con la confirmación escrita que pide la spec §11.

## Qué se hizo

- Pantalla `/ejercicios/$id/editar`, a la que se llega desde el detalle (mockup 5).
- En un ejercicio del catálogo **el nombre se muestra pero no se edita**: lo comparten todos los
  usuarios. En uno propio, sí.
- Se manda **sólo lo que cambió**: mandar todo pisaría con lo mismo y, en uno del catálogo, mandaría
  un nombre que la API rechaza por definición.
- Borrado en una sección aparte, en rojo, con el aviso de que se lleva todas las marcas. El botón
  queda deshabilitado hasta escribir el nombre del ejercicio.
- Guardar vuelve al detalle; borrar vuelve a la lista. Las dos cosas invalidan la lista de Home.

## Decisiones tomadas

- **La confirmación no distingue mayúsculas ni acentos**: usa `sameName`, la misma comparación que
  el resto de la app. Escribir "back squat" alcanza; lo que se busca es un acto deliberado, no una
  prueba de tipeo.
- **La confirmación es una sección de la página, no un diálogo modal.** La spec pide el nombre
  escrito, no un modal, y en un celular una sección con su aviso se lee mejor que una ventana.
- **Sin cambios, no se llama a la API**: se avisa "No cambiaste nada todavía" en vez de mandar un
  PATCH vacío que la API rechazaría.

## Bloqueos / lo que no funcionó

- **Seis pruebas inversas**, todas detectadas: borrar sin confirmar, confirmar con cualquier texto,
  nombre editable en uno del catálogo, mandar todo siempre, no refrescar la lista al borrar, y las
  dos del cliente de API.
- **Una prueba inversa volvió a destapar el mismo hueco que en F1-12**: quitar la invalidación de
  la lista al borrar no rompía ningún test. Se reescribió el test como el recorrido real —Home,
  detalle, editar, borrar— donde la lista está en caché y el ejercicio borrado seguiría apareciendo.
- **El borrado no se pudo clickear en el navegador automatizado.** El panel del navegador estaba
  oculto, y sin él las coordenadas de clic quedan viejas; ni el clic ni la tecla llegaron al botón
  (un botón enfocado con Space y Enter tampoco se activó, igual que en F1-10). La edición sí se
  probó a mano contra la API real: nivel y "con dolor" guardados y vuelta al detalle.
- **De ese intento salió algo mejor que la prueba manual**: las rutas y verbos del cliente de API
  no tenían ningún test —las pantallas usan una API en memoria—, así que un `DELETE` a la ruta
  equivocada no lo veía nadie. Ahora hay tests de cada método, con sus dos pruebas inversas.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): mergear #17 y la PR de F1-15. Con
F1-07 adentro salen F1-13b, F1-14 y F1-18.
