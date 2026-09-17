# ADR-0003: Fastify como framework HTTP de la API

- Fecha: 2026-09-17
- Estado: aceptada

## Contexto
La spec (§6) dice "Node" y "API REST" pero no nombra framework. La arquitectura sí impone tres
cosas concretas: logs JSON con Pino y un set fijo de campos ([architecture.md](../architecture.md)),
un envelope de error único (`{ errorCode, message, requestId }`) y OpenAPI **generado** desde los
schemas Zod, nunca escrito a mano.

## Opciones consideradas
1. **Express 5** — el más conocido. Pino, Swagger y el middleware de error se cablean a mano, y el
   tipado de handlers es flojo.
2. **Fastify 5** — Pino es su logger nativo, tiene ciclo de vida de hooks para el manejo de errores,
   y `@fastify/swagger` + `fastify-type-provider-zod` generan el OpenAPI desde los mismos schemas
   Zod que validan la entrada.
3. **Hono** — muy liviano y con buen tipado, pero nació edge-first y en Node puro el ecosistema de
   Pino/Swagger pide más pegamento.

## Decisión
Opción 2: **Fastify 5** con `fastify-type-provider-zod`. Es el que más cosas de la arquitectura trae
resueltas de fábrica en vez de pedir código propio: el mismo schema Zod valida el request, serializa
la respuesta, tipa el handler y alimenta el OpenAPI.

## Consecuencias
- El requestId se resuelve con `genReqId`, tomando `x-request-id` si el front lo manda — así el
  identificador viaja de punta a punta como pide `architecture.md`.
- La serialización de respuesta valida contra el schema: si un endpoint devuelve algo que no
  declara, es un 500 nuestro y no un contrato roto silencioso para el front.
- Menos ejemplos y menos respuestas de Stack Overflow que Express. A cambio, menos código propio que
  mantener.
- Los plugins son de Fastify: cambiar de framework después implicaría reescribir helmet, cors,
  rate-limit y swagger. Es el costo de no quedarse en el mínimo común denominador.
