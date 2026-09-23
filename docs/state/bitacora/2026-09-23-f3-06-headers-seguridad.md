# 2026-09-23 — F3-06: headers de seguridad en producción

- Autor: Claude Sonnet 5 (agente), con Braian
- Duración aprox: corta

## Objetivo

Confirmar que CSP, HSTS, X-Content-Type-Options y Referrer-Policy están en cualquier respuesta de
producción — no sólo en la API, también en lo que sirve el front (F3-03).

## Qué se hizo

- `security-headers.test.ts`: los cuatro headers en una respuesta de la API, en el `index.html`, en
  un asset y en un 404 — las cuatro formas de respuesta que existen hoy.
- Test de que `script-src` es sólo `'self'`, sin `unsafe-inline` ni `unsafe-eval`.
- Test de HSTS con `includeSubDomains` y `preload`, y de que `frame-ancestors`/`object-src` siguen
  cerrados.

## Decisiones tomadas

- **No se toca `style-src`.** Helmet lo deja con `'unsafe-inline'` por default, y cubre el único
  `style={{}}` inline que tiene el front (`ExerciseDetailPage`, el ancho de la barra de progreso).
  El criterio de la tarea pedía "sin `unsafe-inline` en scripts", no en estilos — sacarlo hubiera
  sido más estricto de lo que pide la tarea, y hubiera roto esa pantalla.
- **Nada de código nuevo**: helmet ya estaba bien configurado desde antes; esta tarea era probarlo,
  no escribirlo.

## Bloqueos / lo que no funcionó

- El primer intento del test pedía "sin `unsafe-inline` en ningún lado" y fallaba contra
  `style-src`, que sí lo tiene por una razón legítima. Corregido a mirar sólo `script-src`.
- Cuatro pruebas inversas: sin helmet, `script-src` con `unsafe-inline`, HSTS sin subdominios, y
  `frame-ancestors` sin restringir. Cada una rompe un test.
- `pnpm e2e:prod`: 13/13, confirmando contra un Chromium real que nada de esto rompió la app.

## Próximo paso

F3-07 (🔑, necesita al usuario: crear los ambientes en Railway) o F3-11 (los runbooks, que puede
avanzar en paralelo mientras F3-07 espera).
