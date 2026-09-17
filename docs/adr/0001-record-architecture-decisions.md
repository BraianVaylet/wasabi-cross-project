# ADR-0001: Registrar decisiones de arquitectura con ADRs

- Fecha: 2026-09-17
- Estado: aceptada

## Contexto

Las decisiones estructurales (elección de stack, patrones, trade-offs de infra) se toman en el momento y se pierden si solo quedan en un commit message o en una conversación con un LLM. Eso obliga a re-derivar el razonamiento cada vez que alguien — humano o IA — necesita entender "por qué está hecho así".

## Opciones consideradas

1. No documentar, confiar en el código y el git log.
2. Documentar todo inline en la spec principal.
3. ADRs cortos, uno por decisión, en `docs/adr/`.

## Decisión

Opción 3. Cada decisión estructural (por ejemplo: elegir Mongo sobre Postgres, modular monolith sobre microservicios, la herramienta de monorepo) se registra en un ADR corto usando [TEMPLATE.md](./TEMPLATE.md). La spec principal ([docs/spec/wasabi-cross.spec.md](../spec/wasabi-cross.spec.md)) referencia los ADRs relevantes en vez de explicar el razonamiento completo inline.

## Consecuencias

- La spec se mantiene corta y enfocada en qué construir, no en por qué se construyó así.
- El razonamiento de cada decisión estructural queda buscable y no se pierde entre sesiones de trabajo.
- Costo: disciplina de escribir el ADR en el mismo PR que introduce la decisión.
