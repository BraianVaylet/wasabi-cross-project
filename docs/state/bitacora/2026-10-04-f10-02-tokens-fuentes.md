# 2026-10-04 — F10-02: tokens, fuentes y estilos base de la landing

- Autor: Claude Sonnet 5.5
- Duración aprox: sesión corta

## Objetivo

F10-02: que la landing use la marca de la app desde la misma fuente, con sus tres tipografías por
Fontsource y el contraste de AA cuidado, antes de escribir ninguna sección.

## Qué se hizo

- `@wasabi-cross/ui` exporta `./tokens.css`. La landing lo importa en `src/styles/global.css`, junto
  con `src/styles/tokens.css` (los ocho tokens propios y la tabla diseño → token) y las fuentes.
- Staatliches y Share Tech Mono (las de la app) y Figtree (400, 500, 600 y 700), sólo `latin`, del
  propio origen; la de los titulares se precarga.
- Tests nuevos: el export de la UI, el contraste (`src/lib/contraste.ts` y todo texto sobre toda
  superficie) y la salida del build (fuentes, otros orígenes, colores sueltos). El build real pasó a un
  `globalSetup` que corre una sola vez.
- Cinco mutaciones a mano, una por regla; verificado en un navegador.

## Decisiones tomadas

- **El export apunta a `src/styles/tokens.css`, no a `dist/`.** Es CSS plano: sin paso de build y sin
  depender de que la librería se haya compilado antes. Cambia lo que decía el plan, que hablaba de
  `dist/tokens.css`.
- **Se importa el archivo entero de la app**, no sólo los tokens: trae `.wc-root` (fondo, color,
  foco visible, titulares en la condensada), `.wc-visually-hidden` y `.wc-plate-cut`, que la landing
  necesita igual. A cambio, los titulares salen en mayúsculas y con el tracking de la app: el `h1`
  coincide con el diseño (`0.035em`), pero `h2` y `h3` salen con `0.08em` y el diseño usa `0.04em`;
  cada sección lo ajusta.
- **El contraste lo cuida un test y el comentario cita al test.** Un comentario con números se
  desactualiza; el test falla.
- **Los tokens nuevos viven en la landing**, no en `@wasabi-cross/ui`: el rosa de Pro, por ejemplo,
  no lo usa la app.
- **Cuatro verdes azulados del diseño pasan a uno** (`--wc-text-soft`), y los dos grises lilas de los
  párrafos a otro (`--wc-text-body`): la diferencia entre ellos no se ve y mantenerlos eran dos
  tokens para lo mismo. El peor contraste sigue siendo 5,2:1.
- **El recorte de esquina usa el token de la app (10 px)**, no los 12 px del diseño.

## Bloqueos / lo que no funcionó

- Nada trabó. Una nota: Fontsource emite también el `.woff` de respaldo de cada peso (13 archivos en
  `dist/_astro/`); el navegador sólo baja el `.woff2`, así que no pesa en la red.

## Próximo paso

Debe coincidir con el punto 12 de "Próximo paso" en [STATE.md](../STATE.md): revisar la PR de F10-02;
después F10-03 (layout, header, footer, 404 y `Screenshot`).
