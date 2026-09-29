# 2026-09-29 — El alta con pestañas: Crear y Catálogo (F5-11 y F5-10)

- Autor: Claude Sonnet 5.5
- Duración aprox: 2 h

## Objetivo

Cerrar el alta de la spec §5.3: una pestaña "Crear" con la definición completa y una pestaña
"Catálogo" que llena ese mismo formulario con un precargado editable.

## Qué se hizo

- **Un solo formulario para las dos pestañas.** El nombre ya no decide nada: `catalogId` (el
  precargado del que se partió) y si la definición cambió deciden qué viaja. Sale el `<datalist>`
  y la categoría deja de quedar fija.
- **Crear (F5-11):** seis categorías, capacidades, grupo primario (uno) y secundarios (sin el
  primario), disciplinas y equipo opcionales, y los campos de la marca según la categoría. Un
  nombre igual al del catálogo se avisa sin bloquear.
- **Catálogo (F5-10):** buscador, filtro de disciplina, tarjetas con categoría, grupo primario y
  equipo, y los que el usuario ya tiene deshabilitados con el motivo — ahora con `alreadyAdded` de
  la API (F5-07). Elegir uno llena el formulario con su definición.
- **Precargado editado:** apenas se cambia un campo aparece el aviso de que se guarda como propio;
  si el plan ya no admite más propios, lo dice. "Volver a los valores del catálogo" restaura la
  definición y "Empezar de cero" vacía el formulario. Viaja siempre `exerciseId` con la
  definición, y el servidor decide (F5-08).
- `sameDefinition` pasa de la API a `@wasabi-cross/schemas`: el formulario avisa con la misma
  regla con la que el servidor decide.
- E2E: entran por el catálogo, y un propio pide el grupo primario.

## Decisiones tomadas

- F5-11 y F5-10 van juntas: hecha sola, F5-11 dejaba rota la pestaña Catálogo de F5-10 (primer
  corte), que dependía de que el nombre decidiera.
- El buscador y el filtro de disciplina filtran en memoria sobre el catálogo que ya trae la
  pantalla; los parámetros `q` y `discipline` de la API (F5-07) quedan para cuando el catálogo
  crezca. El catálogo se vuelve a pedir en cada visita, porque `alreadyAdded` es de cada usuario.
- "Volver a los valores del catálogo" se ofrece siempre que hay una edición, no sólo con el cupo de
  propios lleno: es lo mismo para el usuario y más simple.
- Los campos se cargan de a uno (`setFieldValue`) y no con `form.reset(values)`: al elegir, el
  formulario todavía no está montado y `reset` no dejaba los valores donde lo espera.

## Bloqueos / lo que no funcionó

- El axe de Playwright de la pestaña Crear no corrió en local contra el CI; lo corre el CI.

## Próximo paso

F5-04 (hipertrofia con RM estimado, Epley) y F5-12 (E2E y axe de cierre). Debe coincidir con
[STATE.md](../STATE.md).
