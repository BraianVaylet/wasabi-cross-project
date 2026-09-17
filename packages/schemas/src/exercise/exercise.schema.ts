import { z } from 'zod';
import { timestampsSchema } from '../common/datetime.ts';
import { exerciseIdSchema, userIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';

/** Qué se mide en este ejercicio. Determina cómo se lee un registro y qué se calcula. */
export const measureKindSchema = z.enum(['rm', 'time', 'reps']);
export type MeasureKind = z.infer<typeof measureKindSchema>;

/** Tipo de ejercicio (spec §5). */
export const exerciseCategorySchema = z.enum([
  'fuerza',
  'hipertrofia',
  'gimnastico',
  'running',
  'otro',
]);
export type ExerciseCategory = z.infer<typeof exerciseCategorySchema>;

/** Capacidad que entrena. Es el eje de las estadísticas generales (spec §5). */
export const capacitySchema = z.enum(['fuerza', 'resistencia', 'velocidad']);
export type Capacity = z.infer<typeof capacitySchema>;

export const muscleGroupSchema = z.enum([
  'pectoral',
  'espalda',
  'hombro',
  'biceps',
  'triceps',
  'antebrazo',
  'core',
  'gluteo',
  'cuadriceps',
  'isquiotibiales',
  'gemelo',
  'cuerpo_completo',
]);
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

/**
 * Segmento del cuerpo. Permite la comparación que pide la spec §5 —
 * "detectar si el tren inferior progresa más rápido que el tren superior".
 */
export const bodySegmentSchema = z.enum([
  'tren_superior',
  'tren_inferior',
  'core',
  'cuerpo_completo',
]);
export type BodySegment = z.infer<typeof bodySegmentSchema>;

export const loadTagSchema = z.enum(['liviana', 'media', 'pesada']);
export const levelTagSchema = z.enum(['principiante', 'intermedio', 'avanzado']);

/**
 * Etiqueta de UX sobre cómo le cae el ejercicio al usuario. **No es un registro
 * clínico** (spec §2): no se usa para diagnosticar ni se comparte con nadie.
 */
export const discomfortTagSchema = z.enum(['ninguno', 'molestia', 'dolor']);

export const exerciseTagsSchema = z.object({
  load: loadTagSchema.optional(),
  level: levelTagSchema.optional(),
  discomfort: discomfortTagSchema.optional(),
});
export type ExerciseTags = z.infer<typeof exerciseTagsSchema>;

export const exerciseSchema = z
  .object({
    id: exerciseIdSchema,
    /**
     * `null` = ejercicio del catálogo pre-cargado, visible para todos.
     * Con `userId` = ejercicio custom, visible sólo para su dueño.
     */
    ownerId: userIdSchema.nullable(),
    name: plainText(80).pipe(z.string().min(1, 'El nombre no puede estar vacío')),
    category: exerciseCategorySchema,
    kind: measureKindSchema,
    capacities: z
      .array(capacitySchema)
      .min(1, 'Elegí al menos una capacidad')
      .refine((values) => new Set(values).size === values.length, 'Capacidades repetidas'),
    muscleGroups: z
      .array(muscleGroupSchema)
      .min(1, 'Elegí al menos un grupo muscular')
      .refine((values) => new Set(values).size === values.length, 'Grupos musculares repetidos'),
    bodySegment: bodySegmentSchema,
    tags: exerciseTagsSchema,
    notes: plainText(500).optional(),
  })
  .extend(timestampsSchema.shape);

export type Exercise = z.infer<typeof exerciseSchema>;

/** Un ejercicio del catálogo no tiene dueño: lo ve todo el mundo. */
export function isCatalogExercise(exercise: Pick<Exercise, 'ownerId'>): boolean {
  return exercise.ownerId === null;
}

/** Lo que manda el cliente para crear un ejercicio custom. El dueño lo pone la sesión. */
export const createExerciseSchema = exerciseSchema
  .pick({
    name: true,
    category: true,
    kind: true,
    capacities: true,
    muscleGroups: true,
    bodySegment: true,
  })
  .extend({
    tags: exerciseTagsSchema.optional(),
    notes: exerciseSchema.shape.notes,
  });

export type CreateExercise = z.infer<typeof createExerciseSchema>;

export const updateExerciseSchema = createExerciseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'No hay nada para actualizar');

export type UpdateExercise = z.infer<typeof updateExerciseSchema>;
