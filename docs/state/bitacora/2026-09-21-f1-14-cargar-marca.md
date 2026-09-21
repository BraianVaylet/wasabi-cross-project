# 2026-09-21 — F1-14: cargar una marca nueva

- Autor: Claude Opus 5 (agente), con Braian
- Duración aprox: una sesión

## Objetivo

Cerrar F1-14: el modal del mockup 11 para cargar una marca desde el detalle, con optimistic UI
(spec §11) y rollback si la API la rechaza.

## Qué se hizo

- `Drawer` de `@wasabi-cross/ui` ahora acepta `placement="bottom"`: la misma caja modal (foco
  atrapado, Escape, foco de vuelta al que la abrió) con forma de hoja que sube. Story nueva.
- `apps/web/src/lib/mark-input.ts`: cómo se escribe una marca según la medición (label, placeholder,
  parseo, fecha al mediodía local). Lo comparten el alta de ejercicio (F1-12) y este modal, que
  antes lo tenían duplicado.
- `NewMark`: el modal, con validación local del valor antes de molestar a la API.
- `logRecord` en el cliente de API (`POST /api/v1/exercises/:id/records`), con su caso en
  `api.test.ts` — que también ganó el del historial, que faltaba.
- `optimistic-history.ts`: la marca nueva se mete arriba de la primera página del historial, sin
  tocar el objeto anterior (el rollback lo necesita intacto).
- La mutación en el router: `onMutate` adelanta la marca, `onError` restaura la foto anterior y
  `onSettled` invalida historial y lista, porque el valor actual y la mejor marca salen de la API.

## Decisiones tomadas

- **El modal se cierra al guardar y el error se muestra en la pantalla de atrás** — con optimistic
  UI la marca ya está en el historial: dejar el modal abierto "esperando" contradice lo que se ve.
- **`onSettled` invalida sin `await`** — React Query recién marca el error cuando termina
  `onSettled`; esperando los refetch, el motivo del rechazo llegaba tarde. Lo descubrió un test que
  congela el historial.
- **La fecha se manda al mediodía local** (igual que en F1-12): a medianoche, un huso negativo
  corría la marca al día anterior. El campo tiene `max` en hoy: no hay marcas futuras (spec §5.1).

## Bloqueos / lo que no funcionó

- Dos tests pasaban con el código roto (prueba inversa): el del rollback lo tapaba el refetch de
  `onSettled`, y el de "vuelve a pedir la lista" contaba las llamadas antes de que terminara la
  carga inicial. Reescritos: ahora mueren si se saca el rollback o cualquiera de las dos
  invalidaciones.
- Queda una mutación viva: sacar `cancelQueries` no rompe ningún test. Protege contra una carrera
  (un historial en vuelo que pisa la marca optimista) que jsdom no reproduce sin un test artificial.
- Probado a mano contra la API real (Mongo efímero): `POST` devuelve 201 con la marca, el valor
  actual y la mejor; una fecha futura responde 400 y un valor inválido, `WC-RM-422-001` — que es
  el que muestra la pantalla, con su requestId.
- **Encontrado de paso, fuera de alcance**: `apps/api` no carga el `.env`. Nadie llama a dotenv ni
  usa `--env-file`, así que el paso documentado (`cp .env.example .env` y `pnpm dev`) falla con
  "Configuración de entorno inválida" hasta que las variables se exportan a mano.

## Próximo paso

Queda **F1-18** (E2E del flujo principal + axe en CI), la última de la Fase 1, y nombrar a mano las
seis etiquetas del tablero para cerrar F0-08.
