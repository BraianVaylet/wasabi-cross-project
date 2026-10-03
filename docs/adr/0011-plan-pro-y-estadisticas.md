# ADR-0011: Plan Pro — lo que diferencia a los planes es ver las estadísticas

- Fecha: 2026-10-03
- Estado: aceptada

## Contexto

La spec §4 definía Free y Max por **cantidad**: Free llegaba a 10 ejercicios (3 propios) y Max era
ilimitado. Para hacer cumplir ese límite el backend tiene, en `subscriptions`, un serializador por
usuario con un documento de lock (`entitlement_locks`) y una transacción que cuenta y da de alta
juntos, porque dos altas simultáneas con 9 ejercicios terminaban en 11.

El usuario cambió el modelo (2026-10-03): dos planes, **Free y Pro**, y lo único que los
diferencia es la capacidad de **ver las estadísticas**. Los dos cargan todos los ejercicios y todas
las marcas que quieran. El pago llega en una segunda etapa; ahora sólo se pide la UI para ver y
"cambiar" de plan.

Las estadísticas salen de cuatro endpoints de `stats` (por ejercicio, resumen, composición del
entrenamiento y actividad), y el progreso del detalle de ejercicio pide el mismo endpoint por
ejercicio.

## Opciones consideradas

1. **Pro desbloquea las estadísticas y desaparece el límite de cantidad.** La regla vive en el
   backend: los cuatro endpoints responden 403 a Free.
2. **Conservar el límite de cantidad y sumar las estadísticas como segunda diferencia.** Más
   motivos para pagar, pero contradice lo pedido: "ambas pueden cargar todos los ejercicios que
   quieran".
3. **Bloquear sólo en el front.** Menos código, pero cualquiera con el token ve los datos:
   rompe la regla de la spec §4 de validar en el backend.

Dentro de la 1, qué cuenta como "estadística": (a) sólo la pantalla Estadísticas, (b) la pantalla
sin las generales, (c) todo lo que sale de `stats`, incluido el progreso del detalle.

## Decisión

**Opción 1 y alcance (c)**, elegidos por el usuario.

- `planSchema` pasa de `free | max` a `free | pro`. Se retiran `PLAN_LIMITS`, `limitsFor` y
  `PlanUsage`: el listado de ejercicios ya no informa un cupo.
- El backend gatea con un hook `onRequest` que corre después de `requireSession`
  (`requirePlan('pro')`, en `subscriptions`) y se inyecta a las rutas de `stats` desde la raíz de
  composición, como `requireSession`: `stats` no importa a `subscriptions`. El error es
  `WC-SUBS-403-002`. `WC-SUBS-403-001` (límite alcanzado) se **retira**.
- Se borran el serializador, el documento de lock y el contador de uso. Lo que quedaba para
  consumir cupo era la transacción: el alta usa el mismo `TransactionRunner` que editar y borrar.
  Los índices únicos siguen siendo la garantía ante una carrera de altas del mismo ejercicio.
- Una migración convierte `plan: "max"` en `"pro"` y borra la colección `entitlement_locks`.
  Reversible: `down` vuelve a `max`; los locks eran sólo coordinación, no se recrean.
- El front lee el plan de `/me` (ya lo traía). Con Free no pide estadísticas y muestra un aviso con
  link a la suscripción; con Pro muestra una etiqueta en el header.
- **La pantalla de suscripción es sólo UI.** El botón de cambiar de plan avisa que no está
  disponible y no llama a la API. No hay endpoint para cambiar de plan: un endpoint sin cobro
  permitiría a cualquiera darse Pro, así que no se escribe hasta que haya pasarela.
- El precio de Pro queda **a definir**, a pedido del usuario: la UI dice "A definir" y no un monto
  inventado.

## Consecuencias

- Un usuario que bajaba de Max a Free con más de 10 ejercicios era un caso abierto en la spec;
  desaparece. Bajar de plan sólo quita la vista de estadísticas, no datos.
- `exercises` deja de depender del plan: `addManagedExercise` y `listManagedExercises` no reciben
  `plan`. El módulo `subscriptions` queda con lo que el nombre promete: el plan y lo que habilita.
- Cuando llegue el pago habrá que escribir lo que hoy se omite a propósito: el endpoint de cambio
  de plan, `billing`, el vencimiento y qué pasa al bajar de Pro. La UI de la suscripción ya tiene
  los dos botones esperando esa lógica.
- Tests y E2E que dependían del cupo (`cupo-del-plan.spec.ts`, `exercise-slot.integration.test.ts`)
  se reemplazan por los del acceso a estadísticas.
- El nombre interno cambia de `max` a `pro` en la base: no queda ningún `max` que confunda con
  el `max` de los límites de validación.
