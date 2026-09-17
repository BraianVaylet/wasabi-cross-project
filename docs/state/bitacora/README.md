# Bitácora

Historial **append-only** de sesiones de trabajo reales sobre este proyecto (humanas o con IA). Un archivo por sesión. Nunca se edita retroactivamente — es un log, no un doc vivo.

## Cuándo escribir una entrada

Al cerrar una sesión que produjo un cambio sustantivo: código, una decisión, o un avance real de spec/documentación. No hace falta para preguntas sueltas o sesiones triviales.

## Nombre de archivo

`YYYY-MM-DD-slug-corto.md` — ej: `2026-09-17-spec-cleanup.md`. Si hay más de una sesión sustantiva el mismo día, agregar sufijo `-2`, `-3`.

## Qué la diferencia de un ADR

Un [ADR](../../adr) registra una decisión estructural puntual y sus consecuencias — es atemporal, se referencia después indefinidamente. Una entrada de bitácora registra el **relato** de una sesión: qué se hizo, qué se probó y no funcionó, qué quedó pendiente — tiene fecha y contexto, y casi nunca se vuelve a leer salvo para auditoría o para entender "qué pasó ese día". Si de una sesión sale una decisión estructural, esa decisión se documenta como ADR aparte y la entrada de bitácora la referencia.

## Qué la diferencia del git log

El commit dice **qué cambió** en el código. La bitácora dice **por qué** se trabajó en eso y qué se decidió en el camino — el razonamiento y los callejones sin salida que no entran en un diff.

## Plantilla

Ver [TEMPLATE.md](./TEMPLATE.md).

## Regla de cierre de sesión

Antes de terminar una sesión con cambios sustantivos:

1. Escribir la entrada de bitácora.
2. Si algo relevante del estado del proyecto cambió, actualizar [STATE.md](../STATE.md).

El "próximo paso" de STATE.md y el de la última entrada de bitácora deben coincidir — si no coinciden, alguno de los dos quedó desactualizado.
