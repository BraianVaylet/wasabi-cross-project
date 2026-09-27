# ADR-0008: Tema único "Toxic Cyberpunk", se retira el selector dark/light

- Fecha: 2026-09-27
- Estado: aceptada

## Contexto

Llegó un mockup nuevo (`docs/design/Wasabi Cross · Toxic Cyberpunk.html` + su PNG) con un lenguaje
visual completo y distinto del actual: fondo casi negro violáceo (`#0F041C`), acento lima tóxico
(`#A7DD4F`), magenta (`#EE1B6C`) y violeta (`#411467`) como bordes/superficies, tipografía
monoespaciada (Share Tech Mono) para el cuerpo y una condensada de afiche (Staatliches) para
titulares, todo en mayúsculas y tracking amplio, y un recorte de esquina en diagonal ("plate-cut")
como firma visual en tarjetas y botones.

El sistema actual (`packages/ui/src/styles/tokens.css`, `packages/ui/src/theme`) sostiene dos temas
—dark y light— con su propia paleta y contraste AA documentado, un `ThemeToggle`, persistencia en
`User.preferences.theme` (spec §5.1, F1-08/F1-16) y auditoría axe en los dos temas en cada pantalla
(F1-18, F2-10).

Sólo hay una pantalla diseñada (detalle de ejercicio, el mockup de F1-13a/b). El resto de la app
tiene que seguir el mismo lenguaje, extrapolando los tokens a los demás componentes Cross y
pantallas.

## Opciones consideradas

1. **Tema único**: Toxic Cyberpunk reemplaza dark y light. Se retira el `ThemeToggle`, el campo
   `theme` de preferencias y el selector del Perfil.
2. **Tercer tema**: se agrega `data-theme="cyberpunk"` junto a los dos existentes, el usuario elige
   entre los tres.
3. **Reemplazo parcial**: Cyberpunk pasa a ser el nuevo "dark", el "light" queda como está.

## Decisión

La opción 1, elegida por el usuario: un tema único. Motivos:

- El mockup nuevo no tiene una variante clara (no hay una versión "light" del lenguaje visual:
  el contraste alto sobre fondo casi negro es la pieza central del diseño, no un detalle de tema).
  Inventar una versión "light" de un lenguaje que es, en esencia, neón-sobre-oscuro sería una
  extrapolación sin mockup de por medio, más grande que el resto del trabajo de esta fase.
- Mantener tres paletas (dark/light/cyberpunk) triplica el costo de cada componente nuevo y de
  cada auditoría axe, para un producto de un usuario y sus amigos (spec §12): no hay evidencia de
  que alguien quiera elegir entre dark y light si ninguno de los dos es ya el diseño real.
- Con un solo tema no hace falta persistir preferencia ni resolver un flash de tema al cargar: se
  simplifica `User.preferences` (sale `theme`), la API (`PATCH /api/v1/me/preferences` deja de
  aceptarlo) y el bootstrap que ADR-0007 movió a un archivo aparte para la CSP.

## Consecuencias

- `packages/ui/src/theme` (theme.ts, use-theme.ts) y el componente `ThemeToggle` se retiran.
  `tokens.css` pasa a declarar una única paleta en `:root`, sin variantes por `data-theme`.
- `User.preferences.theme` sale del schema compartido. Migración versionada y reversible que
  quita el campo de los documentos existentes (sólo hay datos de desarrollo; no hay ambientes
  desplegados todavía — spec §12, Fase 3 bloqueada en F3-07/F3-08).
- El Perfil pierde la sección "Color"; los tests y el E2E que cubrían el cambio de tema se
  retiran o se adaptan.
- Los axe de F1-18/F2-10 corren contra un solo tema: menos combinaciones, pero cada color nuevo
  necesita su propia verificación de contraste ≥ 4.5:1 (spec §11), documentada igual que en
  `tokens.css` hoy para dark/light.
- Tipografía nueva vía Fontsource (spec §6), no Google Fonts CDN como en el HTML del mockup:
  `@fontsource/share-tech-mono` y `@fontsource/staatliches`.
- Sólo una pantalla tiene mockup real; el resto se extrapola de los mismos tokens y componentes
  Cross. Cada pantalla es su propia tarea en `docs/ACTION-PLAN.md` (Fase 4) para poder revisarla
  por separado en vez de un cambio gigante de una sola vez.
