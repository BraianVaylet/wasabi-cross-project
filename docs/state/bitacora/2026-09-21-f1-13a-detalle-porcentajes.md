# 2026-09-21 — F1-13a: detalle de ejercicio con porcentajes

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

Los mockups 5 y 6 sin el historial: valor actual, tags, tabla de porcentajes con los del perfil,
porcentaje custom, carga elegida con su banda.

## Qué se hizo

- **F1-13 se partió en dos.** El historial necesita F1-07 (las marcas), que estaba en revisión sin
  mergear; el resto de la pantalla no. F1-13a es lo que se podía hacer ya; **F1-13b** queda con el
  historial, el valor actual marcado como "current" y la mejor marca en los ejercicios de tiempo.
- La tabla usa los porcentajes del perfil (F1-16) y el cálculo que ya vive en
  `@wasabi-cross/schemas` (F1-04): carga al 0,5 kg, repeticiones hacia abajo, y la banda por
  porcentaje.
- **El porcentaje elegido vive en la URL**: un link a `?pct=80` abre el detalle con esa carga.
  Elegir otro reemplaza la entrada del historial del navegador en vez de apilarla.
- En tiempo no hay tabla y se dice por qué (spec §5.1).
- El ejercicio sale de la lista que Home ya tiene en caché; un ID que no está muestra "No
  encontramos ese ejercicio" con un camino de vuelta.

## Decisiones tomadas

- **El porcentaje en la URL va con los search params de TanStack Router, no con Nuqs**, que es lo
  que nombra la spec §6. El router ya valida y tipa los search params, y sumar Nuqs encima sería
  una segunda fuente para lo mismo. **Queda para confirmar con Braian**: si prefiere Nuqs, es un
  cambio acotado a esta pantalla.
- **La carga se recalcula en el front**: cambiar de porcentaje no le pregunta nada a la API.
- **El porcentaje custom mantiene la última carga válida** mientras se tipea. Escribir "120" pasa
  por 1 y 12, que sí valen; al llegar a 120 se muestra el error y la carga queda en la del 12.
- **El radio de cada porcentaje lleva `aria-label` propio**: sin él, el lector de pantalla leía
  "65%65 kg" pegado, porque los dos textos son cajas vecinas.

## Bloqueos / lo que no funcionó

- **Seis pruebas inversas**, todas detectadas: ignorar el `pct` de la URL, no guardarlo, mostrar la
  tabla en un ejercicio de tiempo, dar repeticiones como kilos, no validar el custom y mostrar
  "con dolor" siempre.
- Un test esperaba que un custom fuera de rango volviera al porcentaje inicial. Era mi expectativa
  la que estaba mal, no el código: mientras se tipea hay valores intermedios válidos. El test ahora
  dice lo que la pantalla hace de verdad.
- **Probado a mano contra la API real**: elegir 85% deja `?pct=85` en la URL, y abrir `?pct=95`
  arranca con esa carga y su banda.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): mergear #17 y la PR de F1-13a. Con
F1-07 adentro sale F1-13b (el historial), y detrás F1-14, F1-15 y F1-18.
