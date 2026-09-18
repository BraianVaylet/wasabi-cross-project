# 2026-09-18 — F1-08: preferencias del usuario

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

`GET` y `PATCH /api/v1/me/preferences`: tema y porcentajes de carga por defecto, guardados por
usuario y fuera del documento que maneja Better Auth.

## Qué se hizo

- Contratos en `@wasabi-cross/schemas` (`preferences.api.ts`): `DEFAULT_PREFERENCES` (tema oscuro,
  65/75/80/85/90/95) y `updatePreferencesSchema`, estricto y con al menos un campo. Las reglas de
  los porcentajes son las de F1-01, sin duplicar.
- Módulo `users` nuevo, con sus capas: la regla de defaults en `domain`, los casos de uso en
  `application`, y el store Mongo y las rutas en `infrastructure`. No necesita nada de otro módulo.
- Colección `user_preferences`, un documento por usuario con su ID como `_id`.
- TDD: rojo corrido primero (11 de 11 fallando en HTTP, y el contrato sin módulo), después verde.

## Decisiones tomadas

- **Se guarda sólo lo que el usuario cambió.** Lo demás toma el default al leer. Es literal la
  spec ("si nunca los cambió"), y si un día cambia el default, le llega a quien nunca lo tocó.
- **El cambio es un único `$set` con upsert**, no leer, modificar y escribir: un cambio de tema y
  otro de porcentajes al mismo tiempo no se pisan. No hay test de concurrencia para esto porque
  sería no determinista; lo garantiza la forma de la operación.
- **Sin migración.** Con el ID del usuario como `_id` hay uno por usuario sin índice, y la colección
  la crea el primer guardado.
- **Tema oscuro por defecto**: "dark first" de la spec §11.

## Bloqueos / lo que no funcionó

- **Un test no podía fallar.** "Un campo ajeno se rechaza" mandaba `{ plan: 'max' }`, que sin
  `.strict()` queda vacío y lo frena igual el "no hay nada para actualizar". Se cambió a
  `{ theme: 'light', plan: 'max' }`, que sólo falla si el schema es estricto.
- **Cuatro pruebas inversas**, todas detectadas: default de tema claro, un cambio que pisa la otra
  preferencia, búsqueda sin el usuario y schema sin `.strict()`.
- La API compila contra el `dist` de schemas: con el contrato nuevo sin compilar, el typecheck
  falla hasta hacer `build` de schemas. `pnpm verify` ya lo hace en orden.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): mergear #17 (F1-07) y la PR de
F1-08; la segunda que entre necesita traer `main` antes. Sigue F1-09.
