# 2026-09-22 — Desglose de la Fase 3: a producción

- Autor: Claude Opus 5.5 (agente), con Braian
- Duración aprox: corta

## Objetivo

Desglosar la fase que sigue a Estadísticas —el propio plan la marcaba como "fase propia, la que
sigue"—: poner Wasabi Cross en producción según spec §12.

## Qué se hizo

- Doce tareas, 37 puntos, en `ACTION-PLAN.md`.
- Dos arreglos chicos que aparecieron en fases anteriores y estaban anotados como "fuera de
  alcance": la API que no lee su `.env` (F3-01) y los errores del cliente que responden 500 (F3-02).

## Decisiones tomadas

- **Qué hace la IA y qué no, escrito en el plan.** Las tareas que tocan cuentas, dominios, secrets o
  plata (Railway, Atlas, el monitor de uptime) van marcadas 🔑: las hace el usuario, o la IA con su
  confirmación en el momento. El resto —código, configuración versionada, runbooks, workflows que
  no deployan sin secrets— sí.
- **Una decisión queda abierta en F3-03**: cómo comparten sitio el front y la API, porque la cookie
  de sesión es `SameSite=Lax`. La recomendación es que la API sirva el front: un servicio, un
  dominio, el mismo origen.
- **Backblaze afuera**: spec §12 lo pide para media de ejercicios, y todavía no hay nada que subir.

## Bloqueos / lo que no funcionó

- Nada. STATE.md no se toca en esta PR para no chocar con #39; se actualiza cuando entren las dos.

## Próximo paso

F3-01 y F3-02, que no dependen de nada ni de la decisión de F3-03.
