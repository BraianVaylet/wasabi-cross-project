# 2026-10-14 — Salida a producción sin pasarela: seed en el deploy, IP del cliente y `plan:set`

- Autor: Claude Sonnet 5.5
- Duración aprox: una sesión

## Objetivo

El usuario pidió revisar qué falta para salir a producción, si convenía integrar Auth0, y cómo salir
sin la pasarela de pagos, usando la app él solo al principio. De la revisión salieron tres huecos
que no estaban en el plan y que no dependen de ninguna cuenta (Railway, Atlas, Google, Microsoft):
esta sesión los cierra.

## Qué se hizo

- **F3-13, el catálogo se siembra en cada deploy.** El `preDeploy` sólo migraba, y el seed corría
  con `tsx`: un ambiente desplegado habría arrancado con "Nuevo ejercicio" vacío. `seed:dist` y un
  `preDeploy` en dos pasos (migrar, sembrar). Simulado de punta a punta con `NODE_ENV=production`.
- **F3-14, la IP real del cliente.** `CLIENT_IP_HEADER` (`x-real-ip` en Railway) en `parseEnv`, en
  Better Auth (`advanced.ipAddress`), en el log y en el IaC. Ocho pruebas inversas.
- **F3-15, `plan:set`.** Caso de uso `setPlan`, store de Mongo, el borde del CLI y dos scripts
  (`plan:set` con tsx y `plan:set:dist` compilado). Dry-run por defecto. Catorce pruebas inversas y
  el compilado corrido con `NODE_ENV=production`.
- Spec §4, §12 y §13; [ADR-0014](../../adr/0014-plan-manual-sin-pasarela.md);
  [`docs/runbooks/plan-manual.md`](../../runbooks/plan-manual.md); `.railway/README.md`.
- Tres tareas nuevas en la Fase 3 (13 a 15): de 12 tareas y 37 puntos a 15 y 43.

## Decisiones tomadas

- **Un script de operador y no un endpoint, una variable de entorno ni una migración**
  (ADR-0014). Un endpoint que regala Pro es lo que ADR-0011 evitó; una lista de emails en una
  variable deja dos fuentes de verdad para el plan; una migración deja el email de una persona en
  el repo y corre en staging.
- **`X-Real-IP` como único header de confianza, y no una lista de proxies.** Lo que se pudo ver de
  Railway (foros, con respuestas de su staff) es que su edge pisa `X-Real-IP`, que no publica los
  CIDRs de sus proxies y que se contradice sobre el orden de `X-Forwarded-For`. Adivinar saltos
  habría sido ficción; un header, configurable por variable, se comprueba en staging.
- **No se activó `trustProxy` de Fastify.** La IP sólo se usa para el log y activarlo confiaría en
  `X-Forwarded-For`. El log lee el mismo header que el límite.
- **`plan:set` no crea cuentas.** La identidad nace del ingreso por un proveedor (spec §5.6); el
  script le dice a la persona que entre una vez.
- **`planSource` desde ya**, con un solo valor (`manual`): para que la pasarela, cuando llegue,
  distinga un otorgamiento a mano de una suscripción. Qué hace con él queda por decidir.
- **`plan:set:dist` para ambientes desplegados.** `plan:set` carga el `.env` local, y un
  `OAUTH_DEV_IDP=on` de desarrollo con `NODE_ENV=production` frena el arranque.
- **Auth0: no ahora** (respondido en el chat, sin código). No evita crear los clientes de Google
  y Entra (en producción exige las credenciales propias), suma un salto y obligaría a rehacer buena
  parte de la Fase 9.

## Bloqueos / lo que no funcionó

- **Un test pasaba por la razón equivocada.** El de "el header es el que dice la variable" se
  cumplía sin el cambio, porque todo caía en un cubo compartido y el sexto pedido daba 429 igual. Se
  rehízo para que dos IP distintas tengan límites distintos, que es lo que discrimina.
- **El fixture de un test de integración usaba un payload que la API rechaza (400).** Se reemplazó
  por el alta por catálogo que ya usa `stats-access.test.ts`.
- **Lo que no se pudo comprobar:** qué manda Railway de verdad (F3-12), que `preDeploy` corte en el
  primer comando que falla, `railway run` contra un ambiente real y que Atlas deje entrar desde la
  IP del operador. Todo queda anotado en el plan y en el runbook como verificación de staging.

## Próximo paso

Debe coincidir con el punto 13 de "Próximo paso" en [STATE.md](../STATE.md): revisar los tests de
F3-14 y F3-15 (puerta de entrada y permisos, spec §9) y mergear; después, lo que sólo puede hacer el
usuario (dominio, Railway, Atlas, clientes de OAuth).
