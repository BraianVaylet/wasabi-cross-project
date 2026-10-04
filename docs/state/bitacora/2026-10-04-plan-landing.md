# 2026-10-04 — Plan de acción: landing page con Astro

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta (sólo planificación, sin código)

## Objetivo

El usuario pidió una landing page para el producto, con el diseño que dejó en `docs/landing/` (un
HTML y su PNG), desarrollada con **Astro**, y un plan de acción para hacerla.

## Qué se hizo

- Se leyeron STATE, la spec (§1, §4, §5, §6, §11, §12, §13), el backlog, ADR-0007 y ADR-0008, el
  diseño (HTML completo y PNG), las capturas, `tokens.css`, `plans.ts`, `router.tsx`, el servidor
  estático de la API (`web-front.ts`), `.railway/railway.ts`, `ci.yml` y la configuración de ESLint
  y Prettier. Se vieron a ojo las capturas 04, 09 y 11.
- Se comprobó contra el registro de npm que Astro 7.3.5 usa la misma Vite que el catálogo, y contra
  la documentación de Railway que los _watch paths_ existen pero la referencia del IaC no los
  menciona. Se calculó el contraste de cada par de colores del diseño.
- Se agregó la **Fase 10 — Landing page (Astro)** a [ACTION-PLAN.md](../../ACTION-PLAN.md): 14
  tareas (F10-00 a F10-13), 40 puntos, ninguna de más de 5. Camino, decisiones, hallazgos y lo que
  queda afuera están al principio de la fase.

## Decisiones tomadas

El usuario respondió cuatro preguntas, las cuatro con la opción recomendada:

- **Sitio aparte** (`apps/landing`, su propio servicio estático en Railway, la landing en el dominio
  raíz y la app en `app.`). La alternativa de servirla desde la API en `/` obligaba a mover el Home de
  la app a `/ejercicios` y a tocar el router, `start_url`, el service worker, los redirects y el
  E2E, justo donde la Fase 9 está trabajando.
- **La landing lleva a la app:** "Entrar" y "Empezar gratis", por `PUBLIC_APP_URL`; sin la variable
  no se muestran (hoy no hay producción).
- **Voseo es-AR**, como la app y la spec §11; el diseño estaba en español neutro.
- **Free y Pro según la spec §4:** sin el período "anual" y sin prometer "tendencia" en las
  secciones de Free, porque el progreso es de Pro.

Por mi cuenta, sin preguntar (el usuario las ve en la PR):

- **Se agrega F10-09, privacidad y términos**, que el diseño no tiene: Google y Microsoft piden una
  política de privacidad para publicar la app (F9-10). El texto legal lo aprueba el usuario.
- **La tabla de planes sale de `canViewStats`**, la regla de schemas que ya hace cumplir la API,
  para que la landing no pueda decir otra cosa que la spec.
- **El rosa de Pro del diseño se mantiene**, aunque la etiqueta PRO de la app es lima; queda como
  decisión abierta.
- **Indexable sólo en producción:** staging y CI salen con `noindex`.
- **Sin JavaScript de cliente, sin PWA, sin analytics, sin Tailwind.**

## Bloqueos / lo que no funcionó

- **El PNG del diseño se renderizó con las 11 imágenes rotas** (rutas relativas que no resuelven
  desde donde se sacó). Se trabajó sobre el HTML.
- **Un hallazgo que cambia lo que se le dijo al usuario:** al preguntar el hosting se dio como
  ventaja del sitio aparte que un cambio de copy no reinicia la API. Eso depende de configurar
  _watch paths_ en Railway, y la referencia del IaC no los documenta. Quedó como ventaja
  condicionada en el plan y F10-12 la comprueba.
- No se comprobó que `sharp` no necesite un permiso nuevo en `allowBuilds`, ni que ESLint 10 corra
  `eslint-plugin-astro` sin pelearse con `typescript-eslint` con tipos: F10-01 lo verifica.
- Los archivos de `docs/landing/` (el diseño y las capturas 09 a 11) estaban sin commitear; se
  suben en esta misma PR, sin tocarlos.

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): el usuario revisa el
plan y arranca por F10-00; faltan las tarjetas de la Fase 10 (`/trello-sync`); decidir el dominio
antes de F9-10 en staging y prod.
