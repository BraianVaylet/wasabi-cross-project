# 2026-10-04 — Fase 9: F9-04, tests y seed sin contraseña

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión larga (una tarea de 3 puntos con mucho recableado)

## Objetivo

F9-04: sacar la contraseña de todo lo que hoy abre una sesión sin pasar por el formulario —los tests
de integración de la API y el seed del admin de desarrollo—, antes de que F9-05 apague el email y la
contraseña. Sin cambiar todavía lo que hace la API: el login por contraseña sigue andando.

## Qué se hizo

- **`testUtils` en `createAuth`, sólo con `NODE_ENV=test`**, y un helper `createTestSession`
  (usuario con el plan pedido y su cookie firmada) y `openSession` (otra sesión del mismo usuario,
  que reemplaza al login por contraseña del test de "otro dispositivo"). El `TestHarness` expone
  `auth`. Nueve archivos de test dejan de registrarse por `/api/auth/sign-up/email`: 230 tests
  siguen verdes.
- **El seed, sin contraseña.** `IdentityStore` (puerto) reemplaza a `UserRegistrar`; su
  implementación usa el adaptador interno de Better Auth, así que el id lleva su prefijo. `seedAdmin`
  queda genérico (recibe el proveedor y la cuenta), crea o reutiliza al usuario, lo liga, le asegura
  el plan Pro y **falla si esa cuenta ya es de otro usuario**.
- **El seed y el IdP, de acuerdo.** `seedDevAdmin`, `DEV_ADMIN` y `fakeIdpSubjectFor` en
  `dev-support/`: el seed liga al admin a la cuenta que el IdP emite para ese email, y la pantalla del
  IdP lo ofrece cargado. Un test recorre el ingreso completo con un clic y comprueba que abre la
  sesión del admin sembrado, con plan Pro, sin crear otro usuario.
- **`seed-admin.ts` se mudó de `src/scripts/` a `scripts/`**: usa el IdP, que `src/` no puede
  importar, y deja de ir al `dist/`. `assertDevelopmentOnly` (con test) reemplaza las guardas de
  producción copiadas a mano en cada script.
- **Pruebas inversas:** se rompió a propósito cada una de las nueve protecciones nuevas (testUtils
  fuera de test, el seed que no liga ni sube a Pro ni frena el robo de cuenta, el email sin verificar,
  la guarda de producción, el plan del helper y el desacuerdo entre el seed y el IdP) y un test falló
  cada vez.
- **Probado contra la API real** (`dev:ephemeral`): un clic en el IdP abre la sesión del admin Pro
  (`/stats/summary` responde 200) y la contraseña de antes ya no entra.

## Decisiones tomadas

- **Hasta F9-07 el admin sembrado no puede entrar por la web.** Sin contraseña y sin el botón del IdP
  en la pantalla, no hay cómo. Es consecuencia del orden del plan; queda dicho en STATE y en la
  tarea. En local se registra un usuario y se le sube el plan con el control de `dev:ephemeral`.
- **Se comprueba que `testUtils` no esté, no que no tenga endpoints.** El plugin no registra rutas
  HTTP: lo peligroso es que expone helpers que crean sesiones sin credenciales. El criterio del plan
  decía "ningún endpoint"; el test mira la lista de plugins en `development` y `production`.
- **El `sub` del IdP es público** (`fakeIdpSubjectFor`) para que el seed no adivine ni copie la
  derivación: los dos lados usan la misma función, y el test del clic es el que detecta si algún día
  se separan.

## Bloqueos / lo que no funcionó

- **Mi script de pruebas inversas daba falsos "sobrevivió" en las nueve.** Con `stdio: 'pipe'`, Vitest
  manda las líneas `FAIL` a stderr, y yo sólo miraba stdout; el arreglo (mirar los dos y el resumen
  `N failed`) se rompió una vez más por el quoting de un `node -e`. Lo detecté porque una mutación
  hecha a mano sí fallaba. **Se volvieron a correr las de F9-03 con la detección corregida: las nueve
  siguen detectadas**, así que lo que dice el PR #96 se sostiene.
- El sistema no me dejó borrar unos archivos sin seguimiento del checkout principal (copias
  idénticas a las de `main`) para cambiar de rama; en vez de insistir, se trabajó en un worktree
  aparte (`.claude/worktrees/f9-04-tests-y-seed`), que además no toca lo que hace la otra sesión.
- Un cast para `testUtils` en `createAuth`: su tipo no entra en `BetterAuthPlugin[]` y mezclarlo
  deja a `Auth` sin tipos (la propia documentación del plugin avisa).

## Próximo paso

Revisar y mergear la PR de F9-04; después F9-05 (Better Auth sólo con OAuth), que además tiene que
envolver el `getUserInfo` de Microsoft con el chequeo del `tid`. Debe coincidir con el punto 10 de
"Próximo paso" en [STATE.md](../STATE.md). Faltan las tarjetas de la Fase 9 (`/trello-sync`).
