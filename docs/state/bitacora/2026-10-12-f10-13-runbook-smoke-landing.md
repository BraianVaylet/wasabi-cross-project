# 2026-10-12 — F10-13 (la parte de la IA): el runbook y el smoke de la landing

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta

## Objetivo

F10-13 mezcla lo que toca la cuenta real (dominio, Railway, DNS) con lo que no. Esta sesión hace lo
segundo, como F9-10: el runbook de la landing y un smoke ejecutable, para que cuando el usuario
decida el dominio y cree el servicio no haya nada que escribir: sólo seguir los pasos y correr el
smoke.

## Qué se hizo

- `docs/runbooks/landing.md`: de un vistazo (app y landing), decidir el dominio, las variables por
  ambiente, crear el servicio y el primer deploy, dominios y DNS (con el `www`), lo que cambia en la
  app al pasar a `app.`, el smoke, la primera vez en producción en orden, qué dispara un deploy y
  cómo comprobarlo, cómo se despublica sin que la app se entere, y un deploy malo.
- `src/lib/smoke.ts` y `scripts/smoke.ts` (`pnpm --filter @wasabi-cross/landing smoke`): GET de sólo
  lectura contra cualquier URL, con 12 chequeos, más el del contacto (con `--indexable`) y el del
  `www` (con `--www`). Sale con 0, 1 o 2.
- `test/smoke.test.ts`: 18 pruebas contra el servidor de producción (F10-11) sobre los tres builds,
  y trece mutaciones a mano.
- Una fila en `CLAUDE.md` y `AGENT.md`.

## Decisiones tomadas

- **El smoke separa dónde se pregunta de qué se espera.** `--site-url` es el origen que tiene que
  decir el canonical y el sitemap; `--app-url`, a dónde lleva "Entrar". Así se prueba un build de
  producción desde `127.0.0.1`.
- **Un error de red es un chequeo en rojo, no una excepción.** Un host que no resuelve o un timeout
  tienen que dar el reporte completo, no cortarlo.
- **Es de sólo lectura y no necesita credenciales.** Por eso se puede correr contra producción: lo que
  la spec prohíbe contra prod es el E2E con datos (F3-12).
- **El `www` queda como decisión del usuario.** El servidor no redirige entre hosts. Se prefiere una
  regla del proveedor de DNS (sin código); la alternativa es un 301 por host canónico en
  `server/app.ts`, que habría que escribir y probar.
- **No se escribió una integración con F3-12**: no existe. El smoke es la pieza que va a llamar.

## Bloqueos / lo que no funcionó

- **Mi sonda bloqueó el servidor.** Corrí el CLI con `execFileSync` desde el mismo proceso que
  servía: el servidor no podía contestar y cada chequeo esperó su timeout de 15 s. No era del smoke
  (y confirmó que un timeout sale como chequeo en rojo), pero costó cinco minutos.
- **Cuatro mutantes sobrevivieron a la primera**: mis aserciones miraban el _nombre_ del chequeo y
  no su detalle, y el nombre ya decía la palabra. Se endurecieron para mirar lo que contestó de
  verdad, y se sumó un caso (`/privacidad` redirigiendo a otro lado).
- **La otra sesión (OAuth) estaba offline** y el aviso de que tomaba esta parte no llegó. Había
  terminado F10-12 y no dejó nada abierto en la landing; si hubiera empezado esto por su lado, se
  resuelve en la PR.

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): el dominio, el servicio y
el DNS son del usuario; el runbook dice en qué orden.
