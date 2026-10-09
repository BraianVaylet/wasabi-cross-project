# 2026-10-09 — F10-07: Estadísticas Pro

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta

## Objetivo

F10-07: la sección "Pro suma estadísticas a tus registros" de la landing, con las seis capturas de
estadísticas y el bloque de constancia y ejercicios para retestear. A diferencia de Registro y Funciones,
ésta **es** la sección de Pro y lo dice.

## Qué se hizo

- `Estadisticas.astro` y su texto en `src/content/estadisticas.ts`: el período y el ejercicio junto al
  titular y la etiqueta "PRO · ESTADÍSTICAS" (rosa de Pro); lo general y el entrenamiento; constancia y
  retestear.
- Tests: contenido (nombra a Pro, lo que incluye, el umbral cruzado con la spec §5.4, un `alt` propio por
  captura) y el HTML de la sección (región con nombre, seis imágenes lazy con dimensiones, el orden de la
  página). 166 → 180 en la landing, cobertura al 100 % y nueve mutaciones a mano.
- Revisión en Chromium (axe, medidas, carga lazy, consola) a 390, 768, 1024 y 1280 px.

## Decisiones tomadas

- **Las capturas altas van completas, como el diseño.** A 1280 px miden 2063 y 1774 px de alto. Recortarlas
  o ponerles una altura máxima las deja sin la mitad de la lista de capacidades y de grupos, y un scroll
  interno es un lugar más donde quedarse trabado. Queda como decisión del usuario, anotada en STATE.
- **Texto y par de capturas lado a lado desde 1024 px, no desde 768 px.** Con el diseño, a 768 px cada
  captura del bloque de arriba y del de abajo quedaba en 185 px de ancho: menos que a 390 px. Hasta
  1024 px, el texto va arriba y el par ocupa todo el ancho.
- **El `alt` describe lo que se ve, no lo que decía el diseño.** El del diseño para constancia hablaba de
  la "fecha de última marca"; la imagen muestra "hace 7 días" y "Lo que más mejoró". Un test lo cuida.
- **"Más de ocho semanas" se cruza con la spec.** El test lee `§5.4` y exige "más de 8 semanas (56 días)",
  y que `semanas * 7` dé 56: si la regla cambia en la spec, la landing no puede seguir diciendo otra cosa.

## Bloqueos / lo que no funcionó

- **Mi script de revisión dio las seis capturas "sin cargar".** No era la página: `scroll-behavior: smooth`
  hacía que cada `scrollTo` rápido no llegara a ningún lado antes del siguiente, y las imágenes lazy nunca
  entraban en pantalla. Con `behavior: 'instant'` cargan todas; antes se confirmó bajando de a una.
- **Aparecieron dos cosas que el plan no decía**: el `alt` inexacto del diseño y que la dona de
  disciplinas muestra Hybrid (el hero sigue sin nombrarlo; ya estaba abierto en STATE).

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): revisar la PR de F10-07 y
aprobar su copy, decidir cómo se muestran las capturas altas; después, en paralelo, F10-08 y F10-09.
