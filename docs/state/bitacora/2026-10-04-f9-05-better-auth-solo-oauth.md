# 2026-10-04 — Fase 9: F9-05, Better Auth sólo con OAuth

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión larga (una tarea de 5 puntos, de riesgo alto: es la puerta de entrada)

## Objetivo

F9-05: apagar el email y la contraseña y dejar que se entre **sólo** con un proveedor OAuth, con las
protecciones que decidimos —vinculación apagada, tokens que no se guardan, email verificado
obligatorio, el `tid` de Microsoft chequeado— y que la API no arranque si no hay ningún proveedor.

## Qué se hizo

- **`createAuth`**: sin `emailAndPassword` ni `haveIBeenPwned`; `accountLinking` apagado;
  `updateAccountOnSignIn: false`; un hook que no crea al usuario si el email no vino verificado y
  otros que descartan los tokens; límite de 5 por minuto para `/sign-in/social` y `/callback/*`; los
  errores del callback vuelven al `/login` del front.
- **Módulo `oauth`**: `socialProvidersFor` arma Google y Microsoft (scopes mínimos, `prompt:
select_account`, nombre del perfil o parte local del email, nunca el plan); el `getUserInfo` de
  Microsoft va envuelto en el chequeo de `tid`, `iss` y `aud`; `requireEnabledProviders` frena el
  arranque sin proveedores.
- **Los endpoints de Better Auth**: `isExposedAuthRoute` deja pasar sólo `sign-in/social`,
  `callback/*`, `sign-out` y `get-session`; el resto es un 404 del catálogo.
- **El service worker** deja de contestar con el shell lo que es de la API (`/api/`, `/docs`).
- **Migración** con los índices únicos `(providerId, accountId)` y `user.email`.
- **`translateAuthError`** ya no repite el texto de Better Auth.
- **E2E**: `registrarse()` entra por el IdP falso (sin eso el CI se caía); el IdP falso pasó a usar
  la configuración de producción y acepta claims extra.
- Tests: 690 en la API (eran 516), de ellos los nuevos de claims, perfil, proveedores, política de
  rutas, hooks, migración y el ingreso completo contra el IdP (alta, tokens, vinculación, carrera,
  límite, recorrido por Fastify).

## Decisiones tomadas

- **Se expone una lista corta de rutas, no se tapan las que sobran.** Apagar `emailAndPassword` no las
  desmonta: siguen respondiendo, con otro error. Y Better Auth trae más endpoints de cuenta (cambiar
  el email, borrar al usuario, vincular, listar sesiones) que Wasabi no usa. Una lista explícita de
  lo expuesto es más fácil de revisar que una de lo prohibido.
- **El mensaje de error siempre es el del catálogo**, con el status de su código. El texto de Better
  Auth habla de callbacks y proveedores, en inglés.
- **`user.email` también va con índice único**: el plan decía "revisar" y no lo era.
- **El E2E entra con el mismo `fetch` que hará el botón**, pidiéndole a la API la URL del IdP, y
  sigue el camino de verdad hasta Home, en vez de inventar un atajo. El spec nuevo del ingreso y axe
  quedan en F9-08.

## Bloqueos / lo que no funcionó

- **Un bug que ya existía en producción: el 429 del límite de intentos respondía 500.** Better Auth
  lo manda como `text/plain`; `auth.routes.ts` copiaba ese header y Fastify no serializa un objeto
  con él. Salió porque escribí el test del sexto intento por Fastify; antes ninguno lo pasaba.
- **El E2E de producción se cayó entero (22 tests) por el service worker**, justo el hallazgo que
  habíamos anotado al armar la fase: con la PWA activa (`goto('/login')` la registra), Workbox
  contestaba con `index.html` a la navegación de vuelta del proveedor, así que la API nunca veía el
  código y no se abría la sesión. El de desarrollo no lo ve (no hay service worker). Estaba en F9-07;
  se adelantó acá, con `NAVIGATE_FALLBACK_DENYLIST` y su test, y se comprobó en el `sw.js` generado.
- Mi primer `fetch` del helper del E2E le pegó a Vite (en desarrollo la API es otro origen) y falló
  con "Unexpected end of JSON input"; ahora usa la `apiURL` de la config de Playwright.
- Los fallos que dio el lint fueron todos de tipos más estrictos que el código viejo: con
  `emailAndPassword` fuera de la configuración, Better Auth infiere opciones no opcionales y los `?.`
  de mis tests sobraban.
- Un `node -e` con barras en una regex volvió a perderlas por el quoting: los scripts van a archivos.

## Próximo paso

Revisión humana de los tests (riesgo alto, spec §9); después F9-06 (logs) y F9-07 (la pantalla de
ingreso, con la que vuelve a andar `/login`). Debe coincidir con el punto 10 de "Próximo paso" en
[STATE.md](../STATE.md). Faltan las tarjetas de la Fase 9 (`/trello-sync`).
