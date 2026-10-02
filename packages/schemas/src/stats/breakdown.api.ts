import { z } from 'zod';
import {
  bodySegmentSchema,
  disciplineSchema,
  exerciseCategorySchema,
  muscleGroupSchema,
} from '../exercise/exercise.schema.ts';

/*
 * "Tu entrenamiento" (F7-01, spec §5.4): cómo se reparten los ejercicios que el atleta tiene
 * cargados. No depende del período: mira la lista, no las marcas.
 */

/**
 * Qué parte del total es una porción, en entero. Los de una misma distribución suman 100: el
 * redondeo se reparte por resto mayor, así la leyenda no dice 33 + 33 + 33.
 */
const percentSchema = z.number().int().min(0).max(100);

/** Una porción: cuántos ejercicios caen en ella y qué parte es del total. */
const shareFields = {
  exercises: z.number().int().min(1),
  percent: percentSchema,
};

/**
 * Una disciplina. `null` es "Sin disciplina": los propios no tienen por qué tenerla (spec
 * §5.1). Un ejercicio cuenta entero en cada disciplina que tiene, así que el porcentaje es
 * sobre el total de menciones, no de ejercicios.
 */
export const disciplineShareSchema = z.object({
  discipline: disciplineSchema.nullable(),
  ...shareFields,
});
export type DisciplineShare = z.infer<typeof disciplineShareSchema>;

export const categoryShareSchema = z.object({ category: exerciseCategorySchema, ...shareFields });
export type CategoryShare = z.infer<typeof categoryShareSchema>;

export const segmentShareSchema = z.object({ segment: bodySegmentSchema, ...shareFields });
export type SegmentShare = z.infer<typeof segmentShareSchema>;

/**
 * Cuánto se trabaja un grupo muscular: en cuántos ejercicios es el primario y en cuántos
 * secundario. El puntaje pesa 1 al primario y ½ al secundario (spec §5.4), y el porcentaje
 * es sobre la suma de los puntajes.
 */
export const muscleGroupLoadSchema = z.object({
  muscleGroup: muscleGroupSchema,
  primary: z.number().int().nonnegative(),
  secondary: z.number().int().nonnegative(),
  score: z.number().min(0.5),
  percent: percentSchema,
});
export type MuscleGroupLoad = z.infer<typeof muscleGroupLoadSchema>;

/** Cada lista va de la porción más grande a la más chica; "Sin disciplina", siempre al final. */
export const trainingBreakdownSchema = z.object({
  /** Cuántos ejercicios tiene el usuario: el total de las categorías y de los segmentos. */
  exercises: z.number().int().nonnegative(),
  byDiscipline: z.array(disciplineShareSchema),
  byCategory: z.array(categoryShareSchema),
  bySegment: z.array(segmentShareSchema),
  byMuscleGroup: z.array(muscleGroupLoadSchema),
});
export type TrainingBreakdown = z.infer<typeof trainingBreakdownSchema>;
