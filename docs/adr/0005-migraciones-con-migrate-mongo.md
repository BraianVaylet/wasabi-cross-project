# ADR-0005: Migraciones con migrate-mongo, una vez por deploy

- Fecha: 2026-09-18
- Estado: aceptada

## Contexto

La spec §12 pide migraciones versionadas y reversibles ("`migrate-mongo` o similar"), y CLAUDE.md
prohíbe los cambios manuales en Atlas. Hasta F1-02 los índices se creaban al arrancar la API, lo que
alcanzó para la Fase 0 pero no sirve para el primer cambio de forma de los datos. El monorepo es ESM
y TypeScript estricto, y la API corre en producción desde `dist/`.

## Opciones consideradas

1. **migrate-mongo.** La que nombra la spec. ESM nativo desde la v14, tipos en
   `@types/migrate-mongo`, API programática, `mongodb ^7` como peer. Registra cada migración en una
   colección de changelog y tiene un lock opcional.
2. **Un migrador propio** (~100 líneas): lista tipada de migraciones, changelog y un lock atómico
   con un `_id` fijo.
3. **Seguir creando índices al arrancar.** No cubre migraciones de datos ni es reversible.

## Decisión

Opción 1, **migrate-mongo**, con tres condiciones que salen de leer su código:

- **Se corre una sola vez por deploy, antes de levantar la API**, nunca al arrancar cada instancia.
  Su lock no es atómico: primero consulta si existe y recién después inserta, así que dos instancias
  arrancando a la vez podrían migrar las dos. Corriéndolo como paso único del deploy, la carrera no
  existe. El lock queda activo igual (`lockTtl: 300`) como segunda red.
- **`/ready` responde no-listo si hay migraciones pendientes.** Al sacar los índices del arranque, un
  deploy que se saltó la migración correría sin sus índices únicos y aceptaría duplicados sin
  avisar. Con el probe, esa instancia no recibe tráfico.
- **Nunca se mezclan modos contra la misma base.** migrate-mongo registra cada migración con su
  extensión: `.ts` si corrió desde `src/`, `.js` si corrió desde `dist/`. Una base migrada en un modo
  y corrida en el otro vería todo como pendiente y aplicaría dos veces cada migración. Como la
  librería no deja ignorar la extensión, `shared/db/migrations.ts` se niega a correr si encuentra
  registros del otro modo.

Se descartó la opción 2 porque la 1 funciona una vez entendidos sus límites, y un migrador propio es
código de infraestructura más para mantener en un equipo de una persona.

## Consecuencias

- Las migraciones viven en `apps/api/src/migrations/` como TypeScript. En desarrollo y en tests se
  leen de ahí; en producción, de `dist/migrations/` ya compiladas. Producción no depende de
  interpretar TypeScript en runtime.
- **Ningún archivo de tests puede vivir en `src/migrations/`**: migrate-mongo toma como migración todo
  archivo con la extensión configurada.
- **Una migración no importa código de la app.** Es una foto de la base en ese momento: si mañana
  cambia el nombre de una colección en el código, la migración tiene que seguir haciendo lo mismo.
- Comandos: `migrate up | down | status` en desarrollo, `migrate:dist up` en los ambientes
  desplegados. El seed se niega a correr con migraciones pendientes.
- El deploy tiene que configurar el paso previo (en Railway, _pre-deploy command_). Queda para la
  fase de deploy.
