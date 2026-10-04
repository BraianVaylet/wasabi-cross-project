# 2026-10-03 — Plan de acción: ingreso con OAuth 2.0

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta, a caballo de dos días (sólo planificación, sin código)

## Objetivo

El usuario pidió un plan de acción para implementar OAuth 2.0 en un módulo nuevo. Después lo fue
acotando: **todo el login y el registro por OAuth**, aprovechando las herramientas del proveedor, y
que se olviden los usuarios actuales porque todavía no hay producción (2026-10-04). Más tarde sumó
**Outlook** como segundo proveedor, aceptó cuatro de los cinco supuestos y pidió **mostrar la foto
del usuario en el Perfil**, preguntando qué uso se le puede dar al token.

## Qué se hizo

- Se leyeron STATE, el ACTION-PLAN, la spec (§5, §6, §7, §12, §13), `error-codes.md`, ADR-0011 y el
  código que toca el tema: `better-auth.ts`, `auth.routes.ts`, `auth-error.ts`, `env.ts`,
  `logger.ts`, `composition.ts`, `app.ts`, `vite.config.ts`, `seed-admin.ts`, `ephemeral.ts`, los
  schemas de login y el helper del E2E. También el código de los proveedores de Google y Microsoft
  de Better Auth y la documentación de claims de Microsoft Entra.
- Se agregó la **Fase 9 — Ingreso con OAuth 2.0 (Google y Microsoft)** a
  [ACTION-PLAN.md](../../ACTION-PLAN.md): 11 tareas (F9-00 a F9-10), 42 puntos, ninguna de más de 5.
  Camino, supuestos, hallazgos y lo que queda afuera están al principio de la fase.
- La primera versión del plan (11 tareas, 36 puntos) suponía que convivían contraseña y Google:
  vinculación de cuentas, "Cuentas conectadas" en el Perfil y una API para desconectar. Con el
  ingreso sólo por OAuth sobre un único proveedor todo eso sobraba y se sacó (YAGNI). Con Microsoft
  no vuelve: la vinculación sigue apagada y sólo se agrega el aviso por email repetido.

- El usuario confirmó los dos supuestos que faltaban (Microsoft sólo con cuentas personales,
  cuentas sin vincular) y pidió el PR de la Fase 8 para empezar después de mergearlo. **Ese PR ya
  existía y estaba mergeado** (#93, 2026-10-03, el árbol de `main` idéntico al de la rama), así que no
  había nada que abrir: se cortó `docs/f9-00-ingreso-oauth` desde `origin/main` y se empezó.

## Decisiones tomadas

- **Se interpretó "OAuth 2.0" como cliente OIDC (entrar con proveedores), no como servidor.** La
  spec §2 no tiene integraciones de terceros. Es un supuesto, no una decisión del usuario.
- **Módulo `oauth` sobre Better Auth y no un OAuth a mano.** Better Auth ya hace PKCE, `state` y la
  sesión; lo propio es la configuración de proveedores y las reglas. `auth` se queda con la sesión.
- **Sin migración de cuentas.** No hay producción ni Atlas: las bases de desarrollo con cuentas
  viejas se borran.
- **El IdP falso es el ingreso de desarrollo y del E2E**, y tiene una segunda cara con el layout de
  Microsoft para que el proveedor real de Better Auth corra contra él (`authority`). En producción
  sería un _bypass_: F9-03 es de riesgo alto con tres guardas con test.
- **Microsoft: sólo cuentas personales (`consumers`).** En cuentas de trabajo o escuela el email lo
  controla el administrador del tenant (ataque _nOAuth_). Es un supuesto por confirmar.
- **El email de Microsoft no se da por verificado sin prueba.** Better Auth sólo lo marca así con
  `email_verified` o `verified_primary_email`; si una cuenta personal real no los trae, F9-10 frena y
  se decide con el usuario. No se fuerza `emailVerified: true`.
- **Los tokens no se guardan.** El único uso del _access token_ es pedirle la foto a Microsoft Graph
  durante el ingreso (el ID token de Microsoft no la trae; Google manda la URL en el ID token).
  Refrescarla sin que la persona entre exigiría guardar un _refresh token_; se refresca en cada
  ingreso. Otros usos (Calendar, Fit, Graph) quedan fuera de la spec §2.
- **La foto se sirve desde la API (`/api/v1/me/photo`)**, no se hotlinkea: la CSP por defecto
  (`img-src 'self' data:`) bloquearía la URL de Google y el _data URL_ de Microsoft pesaría en cada
  `/me`. La API sólo baja URLs de `googleusercontent.com`.
- **Spec primero.** Nada de esto está en la spec; F9-00 la actualiza con el usuario antes de que
  nadie codee.

## Bloqueos / lo que no funcionó

- Hallazgos comprobados en el repo y en la documentación, no supuestos:
  - `dist/sw.js` registra `NavigationRoute(index.html)` sin exclusión. El callback de OAuth es una
    navegación, así que con la PWA activa devolvería el shell. Va a F9-07.
  - Sin contraseña no sirve nada de lo que hoy abre una sesión: once archivos de test de la API,
    `registrarse()` del E2E y `seed:admin`.
  - Los scopes por defecto de Microsoft en Better Auth incluyen `offline_access`.
  - La documentación de Microsoft no dice si las cuentas personales reciben `verified_primary_email`.
- Los proveedores de Google y de Microsoft tienen URLs fijas (Microsoft deja cambiar la `authority`,
  pero la llamada a Graph para la foto no). Lo propio de cada uno se prueba una vez, a mano, en F9-10.
- No se tocó la spec, no se hizo ADR ni se creó ninguna tarjeta de Trello.

## Próximo paso

F9-00 (spec §5, §6, §7 y §13, ADR-0012) va en esta misma PR, a la espera del Definition of Done del
usuario. Después, F9-01 y F9-02 en paralelo. Debe coincidir con el punto 10 de "Próximo paso" en
[STATE.md](../STATE.md). Faltan las tarjetas (`/trello-sync`).
