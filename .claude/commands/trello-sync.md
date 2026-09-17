---
description: Sincroniza docs/ACTION-PLAN.md con el tablero de Trello del proyecto
argument-hint: [fase a sincronizar, ej: F0] (opcional; por defecto la fase en curso)
---

Sincroniza el backlog con el tablero **wasabi-cross**: https://trello.com/b/pK3RPkCT/wasabi-cross

Fase: $ARGUMENTS (si viene vacío, usa la fase en curso según `docs/ACTION-PLAN.md`).

1. **Lee primero, escribí después.** Trae las listas y las tarjetas actuales del tablero con el MCP
   de Trello. Nunca crees una tarjeta sin haber verificado que no existe: los duplicados en un
   tablero son peores que una tarjeta faltante.

2. **Estructura esperada del tablero.** Listas: `Sin iniciar`, `En proceso`, `Bloqueadas`,
   `Completadas`, `Canceladas`. Etiquetas: `SPEC`, `TECNICO`, `API`, `WEB`, `INFRA`, `BUG`. Si falta
   alguna lista, creala; las etiquetas no se pueden crear/renombrar por MCP — si faltan, avisá y
   seguí sin ellas.

3. **Formato de tarjeta**, idéntico para todas:

   ```
   Nombre:  F0-03 · Better Auth + Mongo

   Desc:    Fase 0 — Fundaciones · 5 puntos · Riesgo: alto

            Alcance
            - ...

            🔴 Regla dura, si la hay.

            Tests no negociables: ...

            Depends on: F0-01, F0-02
            Detalle: docs/ACTION-PLAN.md → F0-03
   ```

4. **Dirección de la sincronización.** `docs/ACTION-PLAN.md` es la fuente de verdad del contenido;
   Trello es la fuente de verdad del estado. Si difieren en contenido, gana el plan de acción. Si
   difieren en estado, gana el tablero.

5. Al terminar, informá: tarjetas creadas, actualizadas y las que quedaron fuera de sincronía con el
   motivo. No muevas una tarjeta a `Completadas` por tu cuenta: eso lo hace quien termina la tarea,
   cuando cumple el Definition of Done (spec §16).
