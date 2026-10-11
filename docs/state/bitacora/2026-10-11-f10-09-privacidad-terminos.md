# 2026-10-11 — F10-09: Privacidad y términos

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta (retomada tras un corte)

## Objetivo

F10-09: `/privacidad` y `/terminos`, enlazadas desde el footer. Un **borrador** con lo que la spec dice y
con lo que la API hace; el texto legal lo aprueba o lo corrige el usuario antes de mergear (su URL queda
cargada en las consolas de Google y Microsoft).

## Qué se hizo

- `Legal.astro` (un documento para leer: h1, secciones con nombre) y las dos páginas; el texto en
  `src/content/legal.ts`, como datos tipados.
- `src/lib/contacto.ts`: quién responde sale de `PUBLIC_CONTACT_NAME` y `PUBLIC_CONTACT_EMAIL`. Van las dos
  o ninguna; en producción, sin ellas, el build se rompe.
- El footer de todas las páginas enlaza las dos, y entran al sitemap de producción.
- Spec §5.6 ("Datos de conexión") y §5.7 ("Páginas legales").
- Tests: contenido contra la spec y contra el código de la API, el HTML de las páginas en los tres ambientes,
  el contacto y que un build de producción sin responsable no sale. 219 → 283, cobertura al 100 % y
  dieciocho mutaciones a mano.
- Revisión en Chromium (axe, títulos, enlaces, medidas, consola) a 390 y 1280 px.

## Decisiones tomadas

- **La política dice la IP y el navegador.** El criterio de aceptación es que lo que dice que se guarda
  coincida con lo que la API guarda. Better Auth guarda `ipAddress` y `userAgent` con cada sesión (lo
  hace por defecto: se leyó en `internal-adapter.mjs`), el límite de intentos usa la IP como clave en la
  base y los logs de Pino llevan `remoteAddress`. La spec no lo decía y un "nada más" habría sido falso:
  se completó la spec en vez de callarlo. Evitar guardarlo es un cambio de la API que no se tocó.
- **Quién responde no está en el repo.** Es un dato personal y no lo da la spec. Dos variables de build,
  como `PUBLIC_APP_URL`: sin ellas, fuera de producción, las páginas avisan que falta; con
  `LANDING_INDEXABLE=1` el build se rompe, porque una política sin responsable no se publica. No se
  usó el email de la cuenta de quien trabaja con la IA: publicarlo es una decisión suya.
- **"Sólo cookies técnicas", no "la cookie de sesión".** El plan decía que la de sesión era la única; la
  spec §13 pide `sameSite: lax` justamente para que la cookie de `state` sobreviva el regreso del
  proveedor. La política nombra las dos.
- **Cada afirmación tiene un ancla.** La duración de la sesión, `httpOnly`, los tokens en `null` y la
  ausencia de `emailAndPassword` se leen del código de la API en el test: si cambian, la política deja de
  ser cierta y el test falla.
- **Sin cláusulas que nadie respalda.** Jurisdicción, edad mínima, limitación de responsabilidad y el
  organismo de control quedan afuera: las decide quien responde.

## Bloqueos / lo que no funcionó

- **Un corte a mitad de la sesión.** El worktree estaba creado y las dependencias instaladas; se retomó
  desde ahí tras fast-forward a `main`.
- **Bash colapsó otra vez las barras invertidas**: un `\b` de una regex llegó como `` y Python lo
  escribió como backspace en el test. Se encontró con `grep -P` de caracteres de control y se reparó con
  un script en archivo (ya estaba en las notas).
- **El test de "quién responde" atrapó un hueco**: los términos decían el email pero no el nombre.
- **El patrón de una mutación no se aplicó** porque Prettier había juntado un `parrafo(...)` en una
  línea; se ajustó el patrón y se corrieron las que faltaban.

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): que el usuario revise el
texto legal y decida quién responde; después F10-10, que espera al servidor de F10-11.
