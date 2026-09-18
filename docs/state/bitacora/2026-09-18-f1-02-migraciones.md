# 2026-09-18 — F1-02: migraciones versionadas con migrate-mongo

- Autor: Claude (Opus 5), a pedido de Braian
- Duración aprox: 1 sesión

## Objetivo

Reemplazar la creación de índices al arrancar la API por migraciones versionadas y reversibles
(spec §12), antes del primer deploy. Elegir la herramienta, que figuraba como decisión abierta.

## Qué se hizo

- **Se evaluó migrate-mongo leyendo su código**, no sólo su README: el lock, cómo carga las
  migraciones y qué valida de la configuración. Después, una prueba real cargando una migración
  `.ts` bajo Vitest. Funcionó, y se adoptó ([ADR-0005](../../adr/0005-migraciones-con-migrate-mongo.md)).
- Primera migración: los índices únicos `(ownerId, name)` de ejercicios y `(userId, exerciseId)` de
  ejercicios gestionados. Los índices ya no se crean al arrancar.
- `shared/db/migrations.ts`: `migrateUp`, `migrateDown`, `pendingMigrations` y un probe para `/ready`.
- Script `migrate up | down | status`, y `migrate:dist` para correr la versión compilada.
- El harness de tests prepara la base con las migraciones, igual que producción.
- El seed se niega a correr con migraciones pendientes, con un mensaje que dice qué hacer.
- TDD: los tests de migraciones se escribieron primero y fallaron antes de la implementación.

## Decisiones tomadas

- **Una vez por deploy, no al arrancar.** El lock de migrate-mongo no es atómico: consulta si existe
  y recién después inserta. Dos instancias arrancando a la vez podrían migrar las dos. Además, viene
  apagado por defecto (`lockTtl: 0`); queda activo igual como segunda red.
- **`/ready` responde no-listo con migraciones pendientes.** No estaba en el plan. Al sacar los
  índices del arranque, un deploy que se saltara la migración correría sin índices únicos y
  aceptaría duplicados sin avisar.
- **Producción corre las migraciones compiladas**, desde `dist/`, sin depender de interpretar
  TypeScript en runtime. El módulo detecta desde dónde corre por la extensión de su propio archivo.
- **No hay migración de limpieza** de los campos viejos (`kind`, `tags`) que dejó F1-01 en bases
  locales. Ningún ambiente desplegado los tiene, y una migración que borra datos no se puede
  revertir, que es justo lo que pide la spec. Alcanza con recrear la base local. Esto corrige lo que
  anticipaba la [entrada de F1-01](./2026-09-18-f1-01-schemas.md).

## Bloqueos / lo que no funcionó

- **Un riesgo que apareció al probar el camino de producción.** migrate-mongo registra cada
  migración **con su extensión**: `…-indices-ejercicios.ts` desde `src/`, `…-indices-ejercicios.js`
  desde `dist/`. Si alguien corre `pnpm migrate up` desde su máquina contra staging y después el
  deploy corre `migrate:dist`, este último ve todo como pendiente y **aplica dos veces cada
  migración**: inofensivo para un índice, destructivo para una que renombra un campo. La librería
  no deja ignorar la extensión, así que se agregó una guarda que se niega a correr si encuentra
  registros del otro modo. Probada en las dos direcciones.
- **Un falso negativo en la primera prueba de `dist/`.** Falló con `ERR_MODULE_NOT_FOUND`, pero el
  problema era la prueba: el script vivía fuera del repo y Node resuelve los paquetes desde la
  ubicación del archivo. Movido adentro de `apps/api`, anduvo. Se verificó el mensaje de error
  completo antes de tocar el código.
- **Una regex rota por escaping.** La guarda buscaba con un template literal que, al pasar por un
  script de Python, perdió una barra y terminó escapando la interpolación. El test en rojo lo
  mostró; se reemplazó por regex literales, sin interpolar nada.

## Próximo paso

Debe coincidir con "Próximo paso" en [STATE.md](../STATE.md): revisar y mergear la PR de F1-02 y
mover su tarjeta. Quedan destrabadas F1-03, F1-04 y F1-08; F1-05 espera a F1-02 y F1-03.
