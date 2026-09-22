# 2026-09-22 — F2-08: la sección de estadísticas generales

- Autor: Claude Opus 5.5 (agente), con Braian
- Duración aprox: corta

## Objetivo

La segunda mitad del mockup 10: cómo viene cada capacidad y cada grupo muscular, con el período
elegido en la URL.

## Qué se hizo

- `generalStats` en el cliente de API, con su consulta y su caso de ruta.
- La sección "En general": por capacidad y por grupo muscular, en el orden que manda la API (de lo
  que más progresó a lo que menos), con cuántos ejercicios sostienen cada número.
- El selector de período arriba de todo: cambia los dos bloques, el acordeón y el resumen.
- `lib/labels.ts`: cómo se llaman las capacidades y los grupos musculares, compartido con el alta
  de un ejercicio propio en vez de duplicado.

## Decisiones tomadas

- **El período va a la URL sólo cuando el usuario lo elige.** Mientras tanto la URL no lleva ruido,
  los links a la pantalla no tienen que mandarlo, y uno inventado se ignora en vez de romper.
- **Lo que no tiene marcas suficientes se dice en una línea**, no como filas en cero.
- **Sin nada que comparar no se muestra la sección**: el atleta recién empieza, no hay "En general"
  que valga.
- **El color no es la única señal**: la variación lleva su signo; el rojo y el lima acompañan.

## Bloqueos / lo que no funcionó

- **Contraste**: `--wc-danger-text` (#ff8a80) daba 4.0:1 sobre `--wc-surface-muted`, que es el fondo
  de cada fila. Sobre el fondo de la página pasaba, por eso nunca había saltado. Aclarado a #ffa8a1:
  5:1 sobre la fila y 7:1 sobre el fondo. Lo encontré calculándolo al mirar la pantalla, antes de que
  lo encontrara el axe del E2E.
- Con dos listas en la pantalla, un test que buscaba "la" lista dejó de ser único: la del acordeón
  ahora tiene nombre (`Ejercicios`), que además le sirve a un lector de pantalla.
- Cuatro pruebas inversas: el resumen ignorando el período, el período fuera de la URL, lo
  insuficiente sin decirse y la sección vacía mostrándose igual.

## Próximo paso

F2-10: sumar la pantalla de Estadísticas al E2E, con su axe en los dos temas. Cierra la Fase 2.
