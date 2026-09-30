# ADR-0010: Hybrid y Pilates — dos disciplinas nuevas y 58 ejercicios más

- Fecha: 2026-09-30
- Estado: aceptada

## Contexto

[ADR-0009](./0009-catalogo-ampliado.md) fijó cinco disciplinas (gimnasio, crossfit, hyrox,
funcional, running) y 62 ejercicios. El usuario amplió el catálogo a 120 (2026-09-30):

- Huecos de cobertura en gimnasio (jalón, press con mancuernas, sentadilla búlgara, face pull,
  extensión lumbar, encogimientos), CrossFit (variantes de los levantamientos olímpicos, push-up,
  air squat, chest to bar, ring dips), funcional (kettlebell, Turkish get-up) y running (200 m,
  800 m, 1500 m, 3 km, media maratón y maratón). Con eso, `espalda_baja` y `trapecio` dejan de ser
  sólo grupos secundarios.
- Dos disciplinas que el modelo no tenía: **hybrid** y **pilates**, y el equipo que traen:
  colchoneta, reformer, aro y pelota de pilates, más anillas, paralelas, GHD y BikeErg.

La primera versión del catálogo usó esos valores sin ampliar los schemas, y se rompió: el
repositorio valida cada documento al leerlo de Mongo (`exerciseSchema.parse`), así que el seed
fallaba con `ZodError: disciplines[2] Invalid option`, `GET /exercises/catalog` respondía 500 y
`tsc` marcaba unas 60 líneas.

## Opciones consideradas

1. Ampliar `disciplineSchema` y `equipmentSchema` con los valores nuevos.
2. Dejar el catálogo en las cinco disciplinas y mapear lo nuevo a las existentes (Pilates como
   funcional, Hybrid como crossfit).
3. Sacar los ejercicios de Hybrid y Pilates del catálogo.

## Decisión

**Opción 1**, elegida por el usuario: Hybrid y Pilates son disciplinas del producto.

- `disciplineSchema` suma `hybrid` y `pilates`. `equipmentSchema` suma `anillas`, `paralelas`,
  `ghd`, `bikeerg`, `colchoneta`, `reformer`, `aro_pilates` y `pelota_pilates`.
- **Hybrid es una etiqueta transversal**: la llevan 33 ejercicios que ya tienen otra disciplina, y
  uno sólo (Sandbag Over Shoulder). **Pilates** agrupa 15 ejercicios, todos gimnásticos: se miden
  en repeticiones.
- **Las reglas de ADR-0009 siguen igual**: lo que se mide lo decide la categoría; el peso fijo o
  corporal va en gimnástico; running lleva una sola distancia. Sigue afuera la plancha y los
  demás isométricos por tiempo, porque ninguna categoría mide tiempo sin distancia.
- **No hay migración de datos.** Los enums sólo se ensanchan, así que todo documento existente
  sigue siendo válido. El seed crea las entradas nuevas por `catalogKey` y actualiza las
  disciplinas de las existentes (33 suman Hybrid; Sentadilla trasera, Pull-up y otras suman
  disciplinas). La migración `20260928130000-catalogo-nuevo` no se toca: es una foto de ese
  momento.

## Consecuencias

- Spec §5.1 y §5.3 pasan a siete disciplinas y 120 ejercicios. El catálogo del código y su test
  dicen 120.
- El filtro por disciplina del catálogo (F5-07) y el selector del alta toman los valores del enum:
  aparecen Hybrid y Pilates sin más cambio que sus etiquetas en `labels.ts`.
- Un precargado que un usuario ya editó y guardó como propio es una copia independiente: no
  hereda las disciplinas nuevas (queda pendiente lo que ya dejaba ADR-0009).
- Agregar una disciplina o un equipo es un cambio de schema, de etiqueta y de spec: no se puede
  colar sólo desde el catálogo. El test del seed contra Mongo y `tsc` lo detectan.
