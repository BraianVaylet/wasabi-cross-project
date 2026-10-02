# 2026-10-02 — Esfuerzo en lugar de carga, y "mejor marca" donde no hay RM

- Autor: Claude (Sonnet 5.5)
- Duración aprox: –

## Objetivo

Dos ajustes de lenguaje que pidió el usuario: (1) en los ejercicios sin RM, aclarar que lo que se
anota es la mejor marca; (2) cambiar "Carga liviana/media/pesada" por "Esfuerzo bajo/medio/alto".

## Qué se hizo

- `TextField` (`@wasabi-cross/ui`) gana `hint`: una aclaración debajo del campo, enlazada por
  `aria-describedby` (junto con el error si lo hay). Sin lógica de negocio.
- `MARK_FIELD` (`apps/web/src/lib/mark-input.ts`) lleva el `hint` de cada medición que no es RM;
  lo muestran el alta y el modal "Nueva marca".
- `BAND_LABEL` del detalle: "Esfuerzo bajo/medio/alto". Tests, stories y comentarios al día.
- Spec §5.1 (tag "Esfuerzo", aclaración de la mejor marca) y §5.2.

## Decisiones tomadas

- El texto cubre todo lo que no es RM (repeticiones, hipertrofia, tiempo, distancia), no sólo
  tiempo y repeticiones — el criterio del usuario era "ejercicios que no tienen RM".
- Los códigos internos de `LoadBand` (`liviana`/`media`/`pesada`) no se tocan: el pedido es de
  etiquetas, y renombrarlos movería schemas, API y tests sin que el usuario lo vea.
- ACTION-PLAN y bitácoras viejas conservan "carga liviana": son el registro de lo que se pidió
  entonces.

## Bloqueos / lo que no funcionó

- La captura de referencia del detalle (`e2e/__capturas__/detalle-390-linux.png`) muestra el tag
  "CARGA LIVIANA". Es la de Linux, no se puede regenerar en Windows. El texto nuevo tiene el mismo
  largo y el margen es 1%: debería pasar; si el job de E2E falla ahí, se regenera en el CI.

## Próximo paso

Sin cambios: ver [STATE.md](../STATE.md).
