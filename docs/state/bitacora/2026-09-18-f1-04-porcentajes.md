# 2026-09-18 — F1-04: cálculo de porcentajes y bandas de carga

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: sesión corta

## Objetivo

Las funciones puras de la spec §5.1, compartidas por front y back para que calculen exactamente
igual: carga, repeticiones y banda de carga para cada porcentaje.

## Qué se hizo

- `packages/schemas/src/calc/percentages.ts`:
  - `loadFor(rm, %)`: carga al 0,5 kg más cercano.
  - `repsFor(máximo, %)`: hacia abajo, con mínimo 1.
  - `loadBandFor(%)`: liviana (<70), media (70–84), pesada (≥85).
  - `supportsPercentages(kind)`: falso para tiempo.
  - `percentageTable(kind, actual, porcentajes)`: la tabla del detalle, en el orden que eligió el
    usuario; `null` en tiempo.
- TDD: la tabla de casos se escribió primero y falló. Cubre los bordes de cada banda (69,9 / 70 /
  84,9 / 85), el empate exacto del redondeo (47,25 → 47,5), el mínimo de repeticiones, y el ejemplo
  del mockup (RM 100 al 65% → 65 kg, "Light load").
- 100% de coverage en statements, branches, funciones y líneas.
- [ADR-0006](../../adr/0006-reglas-de-dominio-compartidas-en-schemas.md): dónde vive la lógica de
  dominio compartida.

## Decisiones tomadas

- **En `@wasabi-cross/schemas`, no en un paquete nuevo.** El paquete ya alojaba reglas de dominio
  compartidas (`measureKindFor`, `PLAN_LIMITS`), y un workspace más para cuatro funciones es YAGNI.
  El ADR deja escrito cuándo separarlo.
- **Las entradas inválidas tiran `RangeError`**, en vez de devolver un número raro. Un porcentaje
  fuera de 1–100 o un RM de cero son errores de quien llama; la UI valida antes de calcular.
- **El empate exacto redondea hacia arriba** (lo que hace `Math.round`). Queda fijado en un test.
- **La banda se calcula también en repeticiones**, con los mismos umbrales: depende del porcentaje,
  no de la unidad. Mostrarla o no en esas pantallas lo decide F1-13.

## Bloqueos / lo que no funcionó

Nada.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar y mergear la PR de F1-04.
Queda destrabada F1-05, que es el camino crítico de la fase.
