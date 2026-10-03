import { z } from 'zod';
import { exerciseIdSchema, managedExerciseIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';
import {
  exerciseCategorySchema,
  exerciseDefinitionInputSchema,
  exerciseDefinitionInputShape,
  disciplineSchema,
  exerciseDefinitionSchema,
  exerciseSchema,
  measureKindSchema,
  primaryIsNotSecondary,
} from './exercise.schema.ts';
import { levelSchema } from './managed-exercise.schema.ts';
import { markSchema, recordInputSchema } from '../record/record.api.ts';

/*
 * Contratos HTTP de los ejercicios gestionados (F1-05). Viven acá para que el front y el
 * back usen exactamente la misma forma, y para que el OpenAPI salga de ellos.
 */

/**
 * La primera marca: el mismo contrato que cualquier otra (F1-07). El valor se valida recién
 * en el servidor, con la regla de su medición.
 */
const firstRecordSchema = recordInputSchema;

/** Lo que es del usuario sobre el ejercicio, igual para uno del catálogo que para uno propio. */
const userFields = {
  level: levelSchema,
  withPain: z.boolean().default(false),
  notes: plainText(500).optional(),
  firstRecord: firstRecordSchema,
};

/**
 * Lo que manda el formulario de "Nuevo ejercicio" (spec §5.3), siempre con su primera marca:
 *
 * - `catalog`: uno precargado por su ID. Si el formulario se editó, viaja además la
 *   `definition` como quedó; si difiere de la del catálogo, el servidor crea un propio con
 *   ella (ADR-0009). Sin `definition`, es el del catálogo tal cual.
 * - `custom`: uno propio, con toda su definición.
 *
 * Dueño e IDs no están: los pone el servidor desde la sesión.
 */
export const addExerciseSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('catalog'),
    exerciseId: exerciseIdSchema,
    definition: exerciseDefinitionInputSchema.optional(),
    ...userFields,
  }),
  z
    .object({ source: z.literal('custom'), ...exerciseDefinitionInputShape, ...userFields })
    .superRefine(primaryIsNotSecondary),
]);

export type AddExercise = z.infer<typeof addExerciseSchema>;

/**
 * Lo que se pide del catálogo (spec §5.3): `q` filtra por parte del nombre y `discipline`, por
 * disciplina; juntos, se cumplen los dos. Una disciplina que no existe se rechaza.
 */
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  discipline: disciplineSchema.optional(),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

/**
 * Un ejercicio del catálogo, más si el usuario ya lo tiene en su lista: el front lo muestra
 * pero no lo deja elegir (un ejercicio va una sola vez por lista, spec §5.1). Un propio
 * editado a partir del catálogo no cuenta: es otro ejercicio.
 */
export const catalogEntrySchema = exerciseSchema.and(z.object({ alreadyAdded: z.boolean() }));

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export const catalogResponseSchema = z.object({ exercises: z.array(catalogEntrySchema) });

/** Un ejercicio de la lista de Home (mockup 4), con su valor actual. */
export const managedExerciseSummarySchema = z.object({
  id: managedExerciseIdSchema,
  exerciseId: exerciseIdSchema,
  name: z.string(),
  category: exerciseCategorySchema,
  kind: measureKindSchema,
  isCustom: z.boolean(),
  level: levelSchema,
  withPain: z.boolean(),
  notes: z.string().optional(),
  /** La marca de fecha de realización más reciente (spec §5.1). */
  current: markSchema,
});

export type ManagedExerciseSummary = z.infer<typeof managedExerciseSummarySchema>;

/** La lista de Home. Sin tope: los dos planes cargan todos los ejercicios que quieran (spec §4). */
export const exerciseListSchema = z.object({
  exercises: z.array(managedExerciseSummarySchema),
});

export type ExerciseList = z.infer<typeof exerciseListSchema>;

/**
 * Lo que manda el lápiz del detalle (F1-06): nivel, "con dolor", comentarios y, sólo en un
 * ejercicio propio, el nombre. Un comentario vacío borra el que había.
 *
 * Es estricto: un campo que no está acá —la categoría, sobre todo— se rechaza en vez de
 * descartarse en silencio. La categoría no se cambia porque las marcas ya están en su
 * unidad, y el cliente tiene que enterarse de que el cambio no se aplicó.
 */
export const updateManagedExerciseSchema = z
  .strictObject({
    level: levelSchema.optional(),
    withPain: z.boolean().optional(),
    notes: plainText(500).optional(),
    name: exerciseDefinitionSchema.shape.name.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No hay nada para actualizar');

export type UpdateManagedExercise = z.infer<typeof updateManagedExerciseSchema>;
