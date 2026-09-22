import { z } from 'zod';
import { isoDateTimeSchema } from '../common/datetime.ts';
import { exerciseIdSchema, managedExerciseIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';
import { planSchema } from '../user/plan.ts';
import {
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  customExerciseDefinitionSchema,
  measureKindSchema,
} from './exercise.schema.ts';
import { levelSchema } from './managed-exercise.schema.ts';
import { recordInputSchema, recordUnitSchema } from '../record/record.api.ts';

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
 * Lo que manda el formulario de "Nuevo ejercicio" (mockup 9): uno del catálogo por su ID,
 * o uno propio con nombre y categoría, siempre con su primera marca.
 *
 * Dueño e IDs no están: los pone el servidor desde la sesión.
 */
export const addExerciseSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('catalog'), exerciseId: exerciseIdSchema, ...userFields }),
  z.object({ source: z.literal('custom'), ...customExerciseDefinitionSchema.shape, ...userFields }),
]);

export type AddExercise = z.infer<typeof addExerciseSchema>;

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
  current: z.object({
    value: z.number(),
    unit: recordUnitSchema,
    performedAt: isoDateTimeSchema,
  }),
});

export type ManagedExerciseSummary = z.infer<typeof managedExerciseSummarySchema>;

/**
 * Cuánto del plan está usado. El front lo necesita para deshabilitar "New Exercise" y
 * explicar por qué; quien decide igual es el backend (spec §4). `null` es sin límite.
 */
export const planUsageSchema = z.object({
  plan: planSchema,
  total: z.number().int().nonnegative(),
  custom: z.number().int().nonnegative(),
  maxTotal: z.number().int().positive().nullable(),
  maxCustom: z.number().int().positive().nullable(),
});

export type PlanUsage = z.infer<typeof planUsageSchema>;

export const exerciseListSchema = z.object({
  exercises: z.array(managedExerciseSummarySchema),
  usage: planUsageSchema,
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
