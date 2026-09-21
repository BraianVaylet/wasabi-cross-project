# 2026-09-21 — F1-17: aviso de nueva versión de la PWA

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: media sesión

## Objetivo

El popup de la spec §5: cuando hay una versión nueva, avisarle al usuario y dejarlo actualizar.

## Qué se hizo

- `PwaUpdate`: escucha al service worker (registrado en modo `prompt` desde F0-01) y, cuando hay
  una versión esperando, muestra el aviso con "Actualizar" y "Ahora no".
- Va montado **fuera del router**, así aparece esté donde esté el usuario.
- En los tests, el módulo virtual del plugin (`virtual:pwa-register/react`, que sólo existe en el
  build) se resuelve a un stub desde `vitest.config.ts`. El test decide si hay versión esperando.

## Decisiones tomadas

- **Nunca se actualiza solo.** `registerType: 'prompt'` ya lo dejaba así; el aviso lo confirma:
  recargar en medio de una carga de marca sería perder lo que el usuario estaba escribiendo.
- **El aviso tiene nombre accesible propio** ("Versión nueva disponible"): en Home ya hay otra
  región `status`, la de la lista cargando, y sin nombre las dos se confunden.
- **Se descarta con "Ahora no"** y no vuelve hasta la próxima versión: el service worker avisa de
  nuevo cuando hay otra.

## Bloqueos / lo que no funcionó

- **El build de la PWA estaba roto desde la Fase 0 y nadie lo había notado**: faltaba
  `workbox-window`, que importa el módulo de registro. Como hasta ahora nada importaba ese módulo,
  Vite nunca lo resolvía y el service worker no se generaba. Al montar el aviso, el build falló;
  con la dependencia agregada, el precache ya se arma (5 entradas).
- **Tres pruebas inversas**, todas detectadas: avisar siempre, que "Ahora no" actualice igual, y no
  montar el aviso en la app.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): mergear #17, #22 y la PR de F1-17.
**#17 traba F1-13**, que necesita el historial de marcas.
