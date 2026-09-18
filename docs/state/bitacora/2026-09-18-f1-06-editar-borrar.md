# 2026-09-18 — F1-06: editar y borrar un ejercicio gestionado

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

`PATCH` y `DELETE /api/v1/exercises/:id`: cambiar lo que es del usuario sobre un ejercicio, y
sacarlo de la lista con todas sus marcas.

## Qué se hizo

- `updateManagedExerciseSchema`, **estricto**: un campo que no está —la categoría, sobre todo— se
  rechaza en vez de descartarse en silencio. Un comentario vacío borra el que había.
- Editar: nivel, "con dolor", comentarios; el nombre, sólo en uno propio y con las mismas reglas que
  al crearlo (ni el de uno del catálogo ni el de otro propio). Ponerle su mismo nombre con otras
  mayúsculas no choca consigo mismo.
- Borrar: el ejercicio gestionado y todas sus marcas; si era propio, también la definición. Uno del
  catálogo queda intacto.
- `createMongoTransactionRunner`: todo o nada para operaciones de varios documentos que no consumen
  cupo (el serializador de F1-03 es para las que sí).
- TDD, esta vez con el rojo corrido también para el contrato.

## Decisiones tomadas

- **El store sólo busca un ejercicio gestionado por ID y dueño juntos.** No existe forma de pedirlo
  sin decir de quién, así que un ID ajeno se comporta igual que uno inexistente por construcción, no
  por un `if` que alguien podría olvidar.
- **Renombrar uno del catálogo responde `WC-SYS-400-002` con el detalle en `name`**, el código que
  preveía el plan. No se inventó un código nuevo para esto.
- **El borrado de uno propio filtra por dueño**, así que ni un bug podría borrar uno del catálogo.

## Bloqueos / lo que no funcionó

- **Dos tests pasaban antes de que existiera el código.** Con el rojo inicial, 16 fallaron y 2
  pasaron: "el nivel es de cada usuario" sólo verificaba que el del otro no cambiara (y sin PATCH,
  obviamente no cambia), y "borrar el de otro responde 404" aceptaba el 404 de "ruta inexistente".
  Se fortalecieron para que sólo pasen si la funcionalidad existe; el rojo quedó en 18 de 18. Es la
  razón para correr el rojo siempre: un test que no puede fallar no prueba nada.
- **Atomicidad del borrado**, más allá del criterio. El criterio pedía contar marcas después de
  borrar, pero un borrado a medias dejaría marcas huérfanas. Se probó con una falla forzada a mitad
  de camino (no se pierde ninguna marca) y una prueba inversa (borrando las marcas fuera de la
  transacción, el test falla).

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar y mergear la PR de F1-06.
Siguen F1-07 (marcas e historial), F1-08 y F1-09.
