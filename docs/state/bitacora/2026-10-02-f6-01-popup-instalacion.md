# 2026-10-02 — Popup de instalación de la PWA (F6-01)

- Autor: Claude Sonnet 5.5
- Duración aprox: 45 min

## Objetivo

Que la app detecte si el usuario la tiene instalada y, si no, se lo proponga con un popup; y que ese
popup sea el mismo que ya avisa de una versión nueva, para reutilizarlo.

## Qué se hizo

- `PwaNotice`: el popup, sólo presentación (mensaje, acción opcional, salida). Antes el aviso de
  versión tenía el diseño metido adentro de `PwaUpdate`.
- `PwaNotices` (reemplaza a `PwaUpdate`): decide qué popup se ve. Un solo `useRegisterSW` —cada
  llamada registra el service worker— y un solo popup a la vez: gana la versión nueva.
- `useInstallPrompt`: captura `beforeinstallprompt` (con `preventDefault`, para que Chromium no
  muestre su mini-aviso), escucha `appinstalled`, y distingue dos modos: `native` (Chromium, con
  "Instalar" que abre el diálogo del navegador) y `manual` (iOS, que explica "Compartir → Agregar a
  inicio").
- `lib/install.ts`, puro y probado aparte: `isInstalled` (`display-mode` standalone, fullscreen,
  minimal-ui y window-controls-overlay, o `navigator.standalone` de iOS), `isIosDevice` (incluye
  iPadOS, que dice ser una Mac) y el "Ahora no" en `localStorage` con plazo de 14 días.
- `test/setup.ts`: `matchMedia` por defecto, porque jsdom no lo trae y ahora se llama al montar la
  app en todos los tests.
- Spec §5 (los dos avisos) y F6-01 en el ACTION-PLAN.
- 42 tests nuevos y reubicados; el workspace web pasa con 378 tests, ramas al 92,3%.
- Tres pruebas inversas, las tres fallan como deben: sin `preventDefault`, sin el chequeo de "ya
  instalada" y sin recordar el descarte.
- Probado a mano en el navegador embebido con un `beforeinstallprompt` sintético: aparece, "Instalar"
  llama a `prompt()`, "Ahora no" guarda la marca y el popup se va.

## Decisiones tomadas

- **Plazo de 14 días para "Ahora no"** — no estaba en la spec; es un default razonable y queda
  escrito en §5. Desde una pestaña no se puede saber si hay otra copia instalada (en iOS no hay
  evento alguno), así que sin plazo el aviso insistiría en cada visita.
- **Un solo popup a la vez, gana la versión nueva** — dos franjas fijas abajo se pisarían, y en un
  celular de 390px tapan media pantalla.
- **El popup sigue en `apps/web`, no en `@wasabi-cross/ui`** — lo usan sólo estos dos avisos; si
  aparece un tercer uso, se mueve.
- **Fuera de Chromium e iOS no se propone nada** — Firefox y Safari de escritorio no tienen cómo
  instalar la app, y no hay a qué invitar.

## Bloqueos / lo que no funcionó

- El `typecheck` del workspace web fallaba por tipos de `@wasabi-cross/ui` faltantes: `dist` estaba
  sin construir. `pnpm --filter @wasabi-cross/ui build` lo resuelve; no es de este cambio.
- El popup se veía en serif: el aviso de versión (F1-17) vivía fuera de `.wc-root` y nunca había
  heredado la tipografía. Se corrigió en `PwaNotice`, que ahora lleva `wc-root` como el resto de las
  raíces de pantalla.
- Otra sesión trabajaba en el mismo árbol (logo, íconos, manifest, "esfuerzo"). No se tocó nada de
  eso: esta PR sale de un worktree aparte, desde `main`, con sólo estos archivos.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar la PR de F6-01 y probar el
diálogo nativo en un Chrome real con el build de producción. Chromium sólo ofrece instalar con el
manifest completo, así que hacen falta los íconos del logo en `main`.
