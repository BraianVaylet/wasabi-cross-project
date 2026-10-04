# ADR-0013: La landing es un sitio estático aparte (`apps/landing`, Astro)

- Fecha: 2026-10-04
- Estado: aceptada

## Contexto

La spec dejaba la landing page afuera (§1 y §5). El usuario trajo el diseño (`docs/landing`: un HTML,
su PNG y las capturas de la app) y pidió que se desarrolle con **Astro**. Restricciones: un equipo
de una persona, Railway como plataforma (spec §12) y la decisión de [ADR-0007](./0007-la-api-sirve-el-front.md):
la API sirve el front en el mismo origen, porque la cookie de sesión es `SameSite=Lax`.

**`/` ya está ocupada.** El Home de la app es `/`, la API sirve el `index.html` de la PWA ahí y el
service worker de la PWA contesta ese mismo `index.html` a toda navegación. Una landing en `/`
choca con las tres cosas.

La landing es lo opuesto de la app: estática, sin sesión, sin API, sin datos del visitante. Y el HTML
del diseño trae Tailwind y las fuentes por CDN, lo que la CSP (§13) y [ADR-0008](./0008-tema-unico-toxic-cyberpunk.md)
no permiten.

## Opciones consideradas

1. **Sitio aparte.** `apps/landing` es un workspace nuevo, con su propio servicio estático en Railway:
   la landing en el dominio raíz y la app (con la API) en `app.`.
2. **La API la sirve en `/`.** Un solo servicio y dominio. El Home de la app pasa a `/ejercicios`, y
   cambian el router, `start_url`, el service worker, los redirects posteriores al ingreso y el E2E.
3. **Un servicio, ruteo por _host_.** La API sirve la landing o la app según el `Host` (dominio raíz
   o `app.`): un deploy, sin tocar el router, con lógica de ruteo nueva en la API.

Dentro de la 1, cómo se sirve en producción: un **Fastify mínimo** con `@fastify/static` y
`@fastify/helmet` (las mismas dependencias y los mismos headers que la API, y se prueba con
`inject`), o un host de estáticos ajeno a Railway. La spec §12 dice Railway, y al ser estática se
puede mover después.

## Decisión

**Opción 1.** Los motivos pesan en este orden:

- **No toca lo que está en movimiento.** La Fase 9 reescribe la entrada a la app (ingreso, redirects,
  service worker). La opción 2 obliga a cambiar justo eso para mover el Home; la 3 agrega ruteo a la
  API sin necesidad.
- **No hereda el service worker.** La landing no es una PWA: sin manifest ni service worker. El
  problema de que el SW conteste `index.html` a toda navegación no existe en el dominio raíz.
- **CSP propia y estricta.** Sin JavaScript, la landing puede llevar `script-src 'none'` y sin
  `unsafe-inline` en estilos, cosa que la app no puede.
- **La cookie queda donde estaba.** La de sesión es de `app.` (sin atributo `Domain`): la landing no
  la ve. ADR-0007 sigue valiendo para la app y la API, que siguen siendo un solo servicio.

Cómo: `apps/landing` con Astro en modo estático y sin JavaScript de cliente; los colores salen de
los tokens de `@wasabi-cross/ui` y las reglas que cuenta (`canViewStats`, el enum de disciplinas)
de `@wasabi-cross/schemas`; sin Tailwind, CSS propio sobre los tokens, con Fontsource. Enlaza al
ingreso de la app con la URL de la variable de build `PUBLIC_APP_URL`. En producción la sirve un
Fastify mínimo.

## Consecuencias

- **Un servicio y dos _hostnames_ más.** Hay que registrar un dominio: hoy no hay (decisión abierta
  en STATE.md). **Se decide antes de F9-10**: las redirect URIs de OAuth de la app llevan el host
  `app.`, y `WEB_ORIGIN` y `BETTER_AUTH_URL` también.
- **Una ventaja que está condicionada.** Que un cambio de copy no reinicie la API sólo vale si se
  configuran _watch paths_ por servicio: con dos servicios del mismo repo, un push redeploya los dos.
  Railway los tiene como ajuste del servicio, pero la referencia del IaC (`service()`) no los
  documenta. F10-12 comprueba si se pueden declarar en `.railway/railway.ts`; si no, se cargan en el
  panel o se acepta el redeploy conjunto (el arranque de la API tarda segundos).
- **Los textos de los planes viven en dos lugares:** `apps/web/src/lib/plans.ts` y el contenido de la
  landing. Se acepta la duplicación; lo que sí es regla (qué plan ve las estadísticas) sale de
  `canViewStats` en los dos, y cuando haya precio hay que cambiar los dos.
- **Las capturas de la app envejecen.** Son PNG del repo y la UI cambia: cuando dejen de parecerse,
  hace falta un script que las regenere desde la app con datos sembrados (fuera de la Fase 10).
- **Para servirla desde la API (opción 2)** habría que mover el Home a `/ejercicios`, cambiar
  `start_url` del manifest, excluir `/` de la navegación del service worker y registrar una segunda
  raíz estática en la API, que hoy asume una sola. **La opción 3** se hace con una restricción de
  `host` en `@fastify/static`.
- **Se vuelve a evaluar** si el costo de un servicio más pesa o si el dominio termina siendo uno solo.
