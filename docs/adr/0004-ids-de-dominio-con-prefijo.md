# ADR-0004: IDs de dominio con prefijo, usados como `_id` en Mongo

- Fecha: 2026-09-17
- Estado: aceptada

## Contexto

El formato de log de [architecture.md](../architecture.md) muestra `"userId": "usr_789"` y
`"exerciseId": "exo_45"`. Mongo, en cambio, genera `ObjectId` por default. Hay que elegir qué es el
identificador del dominio, porque de eso depende qué se ve en un log, en una URL y en un reporte de
soporte.

## Opciones consideradas

1. **`ObjectId` como id del dominio.** Lo natural en Mongo, pero en un log un `ObjectId` no dice de
   qué entidad es, y `507f1f77bcf86cd799439011` en una URL no se puede leer ni dictar por teléfono.
2. **`ObjectId` interno + un id público con prefijo.** Dos identificadores por documento, con el
   riesgo permanente de filtrar el equivocado.
3. **Id con prefijo como `_id`.** Un solo identificador, `usr_…` / `exo_…` / `rec_…`, que es lo que
   viaja por la API, por los logs y por la URL.

## Decisión

Opción 3. El id del dominio lleva prefijo por entidad y se guarda directo como `_id` (Mongo acepta
cualquier tipo, no sólo `ObjectId`). Los schemas de `@wasabi-cross/schemas` validan el prefijo, así
que pasar un `exerciseId` donde va un `userId` falla en validación y no en producción.

## Consecuencias

- El id del dominio es aleatorio y no secuencial: no filtra cuántos usuarios hay, ni permite
  enumerar recursos probando IDs contiguos — que es el otro lado del riesgo de IDOR de la spec §13.
- Un id suelto en un log o en un ticket de soporte se explica solo.
- No se hereda el timestamp embebido del `ObjectId`; da igual, porque todo documento tiene
  `createdAt` explícito.
- Quien escriba una migración o una query a mano tiene que recordar que `_id` es string. Queda
  documentado acá y en los schemas.
