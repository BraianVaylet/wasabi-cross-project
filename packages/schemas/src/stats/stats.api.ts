import { z } from 'zod';
import { isoDateTimeSchema } from '../common/datetime.ts';
import { managedExerciseIdSchema } from '../common/ids.ts';
import {
  capacitySchema,
  measureKindSchema,
  muscleGroupSchema,
} from '../exercise/exercise.schema.ts';
import { recordUnitSchema } from '../record/record.api.ts';

/*
 * Contratos HTTP de las estadísticas (F2-01, spec §5). Dos respuestas: la de un ejercicio
 * —su serie y sus números— y la general, que compara capacidades y grupos musculares.
 */

/** Ventana de tiempo que mira la pantalla. `todo` es desde la primera marca. */
export const statsPeriodSchema = z.enum(['3m', '6m', '12m', 'todo']);
export type StatsPeriod = z.infer<typeof statsPeriodSchema>;

/** El período llega en la query. Sin él, el último año. */
export const statsQuerySchema = z.object({
  period: statsPeriodSchema.default('12m'),
});
export type StatsQuery = z.infer<typeof statsQuerySchema>;

/**
 * Un punto de la serie. Sin unidad a propósito: es la misma para todas las marcas de un
 * ejercicio y viaja una sola vez, arriba.
 */
export const seriesPointSchema = z
  .object({
    performedAt: isoDateTimeSchema,
    value: z.number(),
  })
  .strip();
export type SeriesPoint = z.infer<typeof seriesPointSchema>;

/** Los números de la evolución, o `null` si no hay marcas en el período. */
export const evolutionSummarySchema = z.object({
  current: z.number(),
  best: z.number(),
  worst: z.number(),
  changePercent: z.number(),
  records: z.number().int().min(1),
});

export const exerciseStatsSchema = z.object({
  id: managedExerciseIdSchema,
  name: z.string(),
  kind: measureKindSchema,
  unit: recordUnitSchema,
  period: statsPeriodSchema,
  /** De la marca más vieja a la más reciente. */
  series: z.array(seriesPointSchema),
  summary: evolutionSummarySchema.nullable(),
});
export type ExerciseStats = z.infer<typeof exerciseStatsSchema>;

/**
 * Un agregado siempre tiene al menos un ejercicio detrás. Lo que no llega a eso no se
 * informa en cero: va a `insufficient`, que es una respuesta distinta de "no progresaste".
 */
const aggregateFields = {
  changePercent: z.number(),
  exercises: z.number().int().min(1),
};

export const capacityStatsSchema = z.object({ capacity: capacitySchema, ...aggregateFields });
export type CapacityStats = z.infer<typeof capacityStatsSchema>;

export const muscleGroupStatsSchema = z.object({
  muscleGroup: muscleGroupSchema,
  ...aggregateFields,
});
export type MuscleGroupStats = z.infer<typeof muscleGroupStatsSchema>;

export const generalStatsSchema = z.object({
  period: statsPeriodSchema,
  byCapacity: z.array(capacityStatsSchema),
  byMuscleGroup: z.array(muscleGroupStatsSchema),
  /** Lo que no tiene marcas suficientes para comparar, dicho en lugar de inventado. */
  insufficient: z.object({
    capacities: z.array(capacitySchema),
    muscleGroups: z.array(muscleGroupSchema),
  }),
});
export type GeneralStats = z.infer<typeof generalStatsSchema>;
