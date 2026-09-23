# 2026-09-22 — F3-03: la API sirve el front

- Autor: Claude Opus 5.5 (agente), con Braian
- Duración aprox: una sesión

## Objetivo

Resolver cómo comparten sitio el front y la API en producción —la cookie de sesión es
`SameSite=Lax`—, con la opción recomendada implementada y un ADR para que el usuario decida al
revisar.

## Qué se hizo

- ADR-0007, en estado **propuesta**: la API sirve el front, un servicio y un origen.
- `WEB_DIST_DIR` en la configuración: con eso la API registra `@fastify/static` y el manejador de 404
  hace de fallback de la SPA. Sin eso, todo como antes.
- El bootstrap del tema pasó de script inline a `public/theme-bootstrap.js`.

## Decisiones tomadas

- **El fallback es estricto**: sólo GET, sólo si el navegador acepta HTML, y nunca en `/api`,
  `/docs`, `/health` ni `/ready`. Un asset que falta es un 404 de verdad; darle el `index.html` a un
  `<script>` sería servir HTML con otro nombre.
- **La decisión queda como propuesta**, no como hecho: si el usuario prefiere dos servicios en
  subdominios, esto se saca sin tocar el resto.

## Bloqueos / lo que no funcionó

- **La CSP de la API bloqueaba el bootstrap del tema** (`script-src 'self'`): con el front servido
  por la API, el script inline no corría y volvía el parpadeo claro/oscuro. Pasó a ser un archivo;
  un test exige ahora que el HTML no tenga scripts inline.
- **El service worker no registraba**, pero no es nuestro: el navegador embebido del panel no
  registra service workers ni siquiera con `vite preview` pelado. Se prueba con el Chromium de
  Playwright en F3-05.
- Descartado en el camino: `upgrade-insecure-requests` no era la causa del service worker —lo
  saqué, probé y lo devolví—.
- Tres pruebas inversas: el fallback sin mirar el `Accept`, sin excluir la API y aceptando POST.

## Próximo paso

F3-05 (la caché de los assets y el E2E contra el build servido por la API), sobre esta misma
decisión.
