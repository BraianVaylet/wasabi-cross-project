# 2026-09-17 — Limpieza de spec inicial + setup de documentación

- Autor: Claude (Sonnet 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

La spec inicial (`docs/spec/wasabi-cross.spec.md`) venía copiada de otro proyecto (un SaaS de gestión de gimnasios) y arrastraba conceptos que no aplican a Wasabi Cross (bookings, tenants, membresías, contratos, CRM, consentimiento de salud). Había que limpiarla, dejar el repo listo para arrancar (CLAUDE.md + docs técnicos), y mejorar la idea de bitácora + estado del proyecto para que futuras sesiones de IA no tengan que re-derivar contexto desde cero.

## Qué se hizo

- Se revisó la spec completa contra los mockups (`docs/mockup/*.jpeg`) para confirmar qué partes eran específicas de Wasabi Cross y cuáles venían copiadas sin adaptar.
- Se reescribió la spec: se sacó todo lo de booking/attendance/membership/contract/CRM/health-consent, se renumeraron las secciones (el original tenía huecos — señal de que era un recorte de un doc más grande), y se agregó una sección explícita "Qué NO es Wasabi Cross" para que esos conceptos no vuelvan a colarse.
- Se separaron del cuerpo de la spec el detalle de arquitectura y el diccionario de códigos de error a documentos propios (`docs/architecture.md`, `docs/error-codes.md`) en vez de vivir inline.
- Se creó `CLAUDE.md` y `AGENT.md` en la raíz.
- Se armó el sistema de ADR (`docs/adr/`) con plantilla y el primer ADR (registrar decisiones con ADRs).
- Se diseñó y scaffoldeó el sistema de `STATE.md` + bitácora — este mismo archivo es la primera entrada real.
- Se agregó `docs/README.md` como índice de toda la documentación.

## Decisiones tomadas

- Separar spec (qué construir) de documentos técnicos (cómo) — la spec se mantiene corta y referencia `docs/architecture.md`, `docs/error-codes.md`, `docs/adr`.
- `STATE.md` se sobreescribe (foto del presente); la bitácora es append-only (historial de sesiones). Son complementarios, no redundantes: uno responde "¿dónde estamos?", el otro "¿por qué llegamos acá?".
- Prefijo de códigos de error pasa de `LP-` a `WC-`; módulos de dominio pasan de los de un SaaS de gimnasios (`BOOK`, `ATTD`, `MEMB`, `CTRT`, `CRM`...) a los de Wasabi Cross (`AUTH`, `USER`, `EXO`, `RM`, `STATS`, `SUBS`, `BILL`, `NOTF`, `SYS`).

## Bloqueos / lo que no funcionó

Ninguno. Quedan abiertas dos decisiones que necesitan al humano (ver [STATE.md](../STATE.md)): herramienta de monorepo y proveedor de pago para la suscripción Max.

## Próximo paso

Scaffoldear el monorepo real (`apps/web`, `apps/api`, `packages/schemas`, `packages/ui`) — ver [STATE.md](../STATE.md).
