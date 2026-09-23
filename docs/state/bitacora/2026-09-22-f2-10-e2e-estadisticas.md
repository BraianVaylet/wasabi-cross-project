# 2026-09-22 — F2-10: el E2E de Estadísticas, y el cierre de la Fase 2

- Autor: Claude Opus 5.5 (agente), con Braian
- Duración aprox: una sesión

## Objetivo

Sumar la pantalla de Estadísticas al E2E de F1-18, con su auditoría axe en los dos temas, y cerrar la
Fase 2.

## Qué se hizo

- `apps/web/e2e/estadisticas.spec.ts`, tres tests:
  - Un ejercicio propio creado **desde el formulario** con sus capacidades, tres marcas, y lo que se
    ve: los números de la evolución (+25%), la tabla accesible con las tres marcas, y el propio
    entrando en el resumen general por capacidad y por grupo muscular. Axe cerrado, abierto y en
    tema claro.
  - El período que recorta: en tres meses queda una marca sola, sin línea y sin variación inventada.
  - Los dos accesos: desde el menú y desde el detalle, que llega con el ejercicio desplegado.
- `AUTH_RATE_LIMIT` (`on` / `off`) en la configuración de la API.

## Decisiones tomadas

- **El límite de registros no se afloja: se apaga sólo en el E2E.** Con nueve atletas nuevos por
  corrida desde 127.0.0.1, el límite de 5 por minuto (spec §13) cortaba el sexto test. `AUTH_RATE_LIMIT=off`
  lo apaga, y `parseEnv` no deja levantar el proceso con eso en producción: la guarda está
  probada.
- **La rama salió de arriba de #38 pero la PR apunta a `main`.** Si se mergea en orden, esta se
  achica sola; nunca queda nada en una rama muerta (lo que pasó con #16).

## Bloqueos / lo que no funcionó

- **El axe del navegador encontró un foco escondido**: TanStack Charts es enfocable por defecto
  (navega los puntos con el teclado) y estaba adentro de un `aria-hidden`. Un usuario de teclado caía
  en algo que el lector de pantalla no anuncia (WCAG 4.1.2). El dibujo sale del orden de
  tabulación y la tabla sigue siendo la versión navegable. Ahora lo cubre también un test de jsdom.
- La primera corrida completa falló en tests que pasaban solos: era el límite de registros, no el
  producto.
- Pruebas inversas del E2E: el período de 3 meses mirando un año hace fallar el test del período, y
  la pantalla sin el resumen general hace fallar el de la evolución.

## Próximo paso

Desglosar la Fase 3 — A producción (spec §12), como PR para revisar antes de codear nada que toque
cuentas o secretos.
