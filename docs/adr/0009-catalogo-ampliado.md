# ADR-0009: Catálogo ampliado — clave estable, taxonomía nueva y reemplazo del catálogo viejo

- Fecha: 2026-09-28
- Estado: aceptada

## Contexto

El usuario trajo un catálogo nuevo de 61 ejercicios en JSON, más rico que el de la Fase 0 (33
ejercicios en `apps/api/src/modules/exercises/domain/catalog.ts`). Además de nombre y categoría,
cada entrada trae disciplinas, equipo, un grupo muscular primario y secundarios, una sola
capacidad, `bilateral`, los campos que se registran, si calcula porcentaje del RM, el tipo de
referencia (`RM_directo`, `RM_estimado`) y la fórmula de estimación (`epley`).

Choca con el modelo actual en varios puntos:

- Trae una **quinta categoría**, "Cardio (metros/calorías)", y una capacidad nueva, **potencia**.
  Aparecen dos grupos musculares nuevos: espalda baja y trapecio.
- **Hipertrofia** calcula el % sobre un RM estimado con Epley, en kg. La spec decía repeticiones =
  máximo × %.
- Los grupos musculares vienen **separados en primario y secundarios**, y la regla del segmento
  ("cuerpo completo si hay grupos de más de un segmento") convierte a casi todo en cuerpo completo:
  Back squat con core de secundario dejaría de ser tren inferior.
- El seed usa el **nombre como clave**: renombrar un ejercicio crea uno nuevo. El catálogo nuevo
  renombra casi todos los que ya existían (Back squat → Sentadilla trasera) y le cambia la
  categoría a varios (Thruster y Remo con barra pasan de fuerza a hipertrofia; Row 500 m pasa de
  running a cardio). Cambiar la categoría de un ejercicio con marcas las deja en otra unidad.
- La pantalla de alta decide "catálogo o propio" por el nombre escrito, y un ejercicio del catálogo
  no se puede editar. El usuario pidió dos pestañas y que un precargado se pueda editar.

Al revisar los datos, el usuario decidió además (2026-09-28): sacar los ejercicios de running sin
distancia única (Long run, Fartlek, Tempo run, etc.) y sumar carreras de 100 m, 400 m, 1 km, 5 km y
10 km; pasar a gimnástico los de peso fijo (Wall Ball, Crunch, Medicine Ball Slam, Kettlebell
Swing); crear versiones de Hyrox en metros de Sled Push, Sled Pull y Farmers Carry (las originales
quedan en funcional). Resultado: 62 ejercicios y una sexta categoría, **distancia con carga**.

## Opciones consideradas

**Qué campos del JSON se guardan:**

1. Guardar todos tal cual vienen.
2. Guardar sólo lo que no se deduce de la categoría, y derivar el resto.

**Clave del catálogo:**

1. Seguir con el nombre.
2. Una clave estable (`catalogKey`), el `id` del JSON.

**Qué hacer con el catálogo viejo:**

1. Migrar: renombrar los equivalentes que no cambian de categoría y retirar el resto.
2. Reemplazar de cero: borrar el viejo y cargar el nuevo.
3. Sumar sin tocar el viejo, con duplicados como "Back squat" y "Sentadilla trasera".

**Editar un precargado al agregarlo:**

1. Si se edita la definición, se guarda como ejercicio propio.
2. Sigue siendo del catálogo, con ajustes por usuario en el ejercicio gestionado.
3. La definición queda fija (lo de hoy).

**Segmento del cuerpo:**

1. Derivarlo de todos los grupos (lo de hoy).
2. Derivarlo sólo del grupo primario.

## Decisión

- **Se deriva lo que depende de la categoría** (opción 2): `campos_registrables`,
  `calcula_porcentaje_rm`, `tipo_referencia` y `formula_estimacion` no se guardan. En los 62 son
  consistentes con su categoría, y guardarlos abriría la puerta a un ejercicio que contradiga su
  categoría. Sigue la regla de ADR-0006: las reglas de dominio viven una sola vez, en
  `@wasabi-cross/schemas`. `bilateral` tampoco se importa: su semántica está invertida (vale `true`
  en estocadas y step-ups, que se hacen de a una pierna) y nada lo usa.
- **Se guardan**: `catalogKey` (sólo en los del catálogo), `disciplines` (lista, al menos una en el
  catálogo, opcional en los propios), `equipment` (uno, obligatorio en el catálogo, opcional en los
  propios) y `primaryMuscleGroup`. `muscleGroups` sigue siendo la lista completa —primario primero,
  sin repetidos—, así Estadísticas no cambia su forma de contar; la invariante es que el primario
  esté en la lista. La capacidad única del JSON se guarda como lista de uno.
- **Clave estable** (opción 2): el seed compara por `catalogKey`, con un índice único parcial
  sobre los ejercicios sin dueño.
- **Reemplazo de cero** (opción 2), elegido por el usuario: no hay producción, así que sólo se
  pierden datos de desarrollo y staging. La migración borra los ejercicios del catálogo viejo y los
  gestionados y marcas que apuntan a ellos, y completa `primaryMuscleGroup` en los propios que ya
  existan (el primero de su lista). Su `down` vuelve a poner el catálogo viejo, pero **no puede
  devolver los gestionados ni las marcas borrados**: es la única parte no reversible, y es
  aceptable sólo porque no hay usuarios reales. Después de producción, un cambio así va por la
  opción 1.
- **Un precargado editado pasa a ser propio** (opción 1), elegido por el usuario: no hay
  definiciones por usuario que Estadísticas y el detalle tengan que resolver, y la regla del plan
  sigue siendo simple (cuenta como propio). El backend decide qué es "editado": compara la
  definición recibida con la del catálogo, así un cliente viejo no puede colar un propio como si
  fuera del catálogo.
- **Segmento por el grupo primario** (opción 2): espalda baja cuenta como core; trapecio, como
  tren superior.
- **Categorías nuevas**: cardio (metros + calorías) y distancia con carga (metros + peso). Las dos
  tienen la misma forma —metros de valor principal, mejor marca = máximo, sin porcentajes— y sólo
  cambia el dato extra. Hipertrofia pasa a calcular la carga en kg sobre el RM estimado con Epley, y
  su mejor marca pasa a ser la de mayor RM estimado.

## Consecuencias

- La spec §5.1 y la nueva §5.3 reflejan todo lo anterior; el backlog es la Fase 5 del
  ACTION-PLAN.
- La medición (`MeasureKind`) suma dos valores, y cada lugar que hace `switch` sobre ella —el alta,
  el modal de marca, el detalle, Home, el historial y Estadísticas— tiene que contemplarlos. El
  compilador marca los que falten si los `switch` son exhaustivos.
- Cambia el significado de "mejor marca" en hipertrofia: una marca vieja puede dejar de ser la
  mejor. `pr.achieved` se recalcula con la regla nueva; no hay migración de datos porque la mejor
  marca no se guarda.
- `WC-EXO-409-004` (un propio con el nombre de uno del catálogo) se retira: un precargado editado
  conserva el nombre del catálogo si el usuario no lo cambia, y en "Crear" la coincidencia de
  nombre sólo se avisa. El índice único `(ownerId, name)` sigue impidiendo dos propios con el
  mismo nombre en la lista de un usuario.
- Epley se aleja del RM real por encima de ~10 repeticiones. Se acepta: es la fórmula que trajeron
  los datos, y se puede cambiar en un solo lugar.
- El catálogo deja de ser un array escrito a mano para comparar con los mockups: son 62 entradas,
  y un test valida cada una contra el schema del catálogo.
- Queda pendiente: qué pasa con un precargado editado cuando el catálogo cambia esa entrada (hoy
  nada: el propio es una copia independiente).
