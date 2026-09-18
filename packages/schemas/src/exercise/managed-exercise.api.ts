import { z } from 'zod';
import { isoDateTimeSchema } from '../common/datetime.ts';
import { exerciseIdSchema, managedExerciseIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';
import { planSchema } from '../user/plan.ts';
import {
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  measureKindSchema,
} from './exercise.schema.ts';
import { levelSchema } from './managed-exercise.schema.ts';

/*
 * Contratos HTTP de los ejercicios gestionados (F1-05). Viven acá para que el front y el
 * back usen exactamente la misma forma, y para que el OpenAPI salga de ellos.
 */

/**
 * La primera marca. El valor se valida recién en el servidor, con la regla de su tipo de
 * medición: para uno del catálogo, el cliente no sabe la categoría — la sabe el servidor.
 */
const firstRecordSchema = z.object({
  value: z.number(),
  performedAt: isoDateTimeSchema.optional(),
  notes: plainText(300).optional(),
});

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
  z.object({ source: z.literal('custom'), ...exerciseDefinitionSchema.shape, ...userFields }),
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
    unit: z.enum(['kg', 'reps', 's']),
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
