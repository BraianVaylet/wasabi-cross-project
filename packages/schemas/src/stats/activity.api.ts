import { z } from 'zod';
import { isoDateTimeSchema } from '../common/datetime.ts';
import { managedExerciseIdSchema } from '../common/ids.ts';
import { statsPeriodSchema } from './stats.api.ts';

/*
 * Constancia, récords y para retestear (F7-02, spec §5.4): lo que el atleta hizo con sus
 * marcas. Mira el período, salvo la última marca y los ejercicios para retestear, que miran
 * todo el historial.
 */

/** Pasado este tiempo sin una marca nueva, un ejercicio se propone para retestear. */
export const STALE_AFTER_DAYS = 56;

/** Cuántos ejercicios muestra "lo que más mejoró". */
export const TOP_IMPROVEMENTS = 3;

/** Un mes del calendario, `2026-09`. Es el de la fecha de la marca en UTC (spec §5.4). */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Un mes es AAAA-MM');

/** Cuántas marcas se cargaron en un mes. Los meses sin marcas van en cero: un hueco es un dato. */
export const monthlyRecordsSchema = z.object({
  month: monthSchema,
  records: z.number().int().nonnegative(),
});
export type MonthlyRecords = z.infer<typeof monthlyRecordsSchema>;

const exerciseRefFields = {
  id: managedExerciseIdSchema,
  name: z.string(),
};

/** Uno de los que más mejoraron: la variación del período, siempre una mejora. */
export const improvementEntrySchema = z.object({
  ...exerciseRefFields,
  changePercent: z.number().positive(),
});
export type ImprovementEntry = z.infer<typeof improvementEntrySchema>;

/** Uno para retestear: cuándo fue su última marca y cuántos días pasaron. */
export const staleExerciseSchema = z.object({
  ...exerciseRefFields,
  lastRecordAt: isoDateTimeSchema,
  days: z
    .number()
    .int()
    .min(STALE_AFTER_DAYS + 1),
});
export type StaleExercise = z.infer<typeof staleExerciseSchema>;

export const trainingActivitySchema = z.object({
  period: statsPeriodSchema,
  /** Marcas cargadas en el período. */
  records: z.number().int().nonnegative(),
  /** Del mes más viejo del período al actual, sin saltear ninguno. */
  byMonth: z.array(monthlyRecordsSchema),
  /** La última marca de todas, sin importar el período; `null` sin marcas. */
  lastRecordAt: isoDateTimeSchema.nullable(),
  daysSinceLast: z.number().int().nonnegative().nullable(),
  /**
   * Mejores marcas nuevas del período: las que superaron a todas las anteriores de su
   * ejercicio. La primera de un ejercicio y el empate no cuentan.
   */
  personalBests: z.number().int().nonnegative(),
  /** De la que más mejoró a la que menos. */
  topImprovements: z.array(improvementEntrySchema).max(TOP_IMPROVEMENTS),
  /** Del más olvidado al más reciente. */
  stale: z.array(staleExerciseSchema),
});
export type TrainingActivity = z.infer<typeof trainingActivitySchema>;
