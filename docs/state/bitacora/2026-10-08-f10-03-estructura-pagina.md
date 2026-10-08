# 2026-10-08 — F10-03: la estructura de la página de la landing

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión larga, cortada por días (se retomó el 2026-10-08)

## Objetivo

F10-03: el esqueleto de toda página de la landing —layout, header, footer, 404, enlace de salto— y los
dos componentes que usan las secciones: `AppLink` ("Entrar" y "Empezar gratis") y `Screenshot`.

## Qué se hizo

- `BaseLayout` (landmarks, `lang="es-AR"`, enlace "Saltar al contenido", la precarga de la tipografía
  que pasó de `index.astro`), `Header` (logo, nav de anclas desde 768 px y "Entrar"), `Footer`, `Marca`,
  `404`, y `Screenshot` con `astro:assets`.
- `urlIngreso` (`src/lib/app-url.ts`), `ScreenshotProps` (`src/lib/screenshot.ts`) y los textos en
  `src/content/sitio.ts`.
- Las 13 capturas que se usan, copiadas a `src/assets/capturas/`.
- Tests: la URL del ingreso, el contenido, el componente (Container API de Astro), la estructura y la
  404 sobre dos builds reales (sin y con `PUBLIC_APP_URL`), las imágenes, y una prueba de tipos de
  que el `alt` sigue siendo obligatorio. 77 en total.
- Revisión en Chromium (axe, teclado, layout) y once mutaciones a mano.

## Decisiones tomadas

- **`AppLink` rompe el build con una `PUBLIC_APP_URL` inválida**, en vez de ocultar los botones: un
  deploy mal configurado tiene que notarse. Sin la variable (o vacía) sigue sin renderizar nada.
- **El logo enlaza a `/`**, no a `#inicio`: así sirve igual en la 404. Por lo mismo, la 404 no lleva la
  nav de secciones ni el enlace a `#demo`.
- **El `alt` obligatorio se prueba con un archivo de tipos** (`test/screenshot.types.ts`, con
  `@ts-expect-error`) que corre `astro check`, además del chequeo en tiempo de ejecución contra un
  alt vacío.
- **WebP calidad 85, en 390 y 780 px.** No se probó AVIF: codificarlo para trece capturas, varias muy
  altas, alarga el build, y el ahorro extra no se midió.
- **Los `.astro` son lo que se prueba con el Container API** (experimental en Astro 7) y con builds
  reales; el coverage mide los `.ts`.

## Bloqueos / lo que no funcionó

- **`MissingSharp`**: Astro no encontraba `sharp` aunque estaba instalado como opcional de `astro`.
  Con pnpm estricto hay que declararlo en la landing. Corrige lo dicho en la bitácora de F10-01.
- **Dos de las diez primeras mutaciones no rompieron ningún test.** Una era un hueco real: la 404 con la
  nav de secciones no tenía test. La otra era equivalente: quitar `format="webp"` no cambia nada porque
  WebP es el default de Astro (se probó forzando PNG, y ahí sí falla).
- **El lint rechazó cuatro cosas** que `astro check` aceptaba: el `JSX` de Astro (`any`), una interfaz
  vacía, un `.test()` y los `.astro` importados desde un `.ts`.
- **Apareció un advisory nuevo, no de esta tarea:** `source-map-js` <1.2.2, alta, por `postcss`, que
  rompe el job `audit` en cualquier PR. Se arregló aparte en la PR #103; esta PR muestra el `audit` en
  rojo hasta que se mergee.

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): revisar la PR de F10-03;
después, en paralelo, F10-04 y las secciones F10-05 a F10-09.
