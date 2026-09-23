import { z } from 'zod';
import { timestampsSchema } from '../common/datetime.ts';
import { exerciseIdSchema, userIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';

/**
 * Qué se mide en un ejercicio. Determina cómo se lee una marca y qué se calcula.
 *
 * `weighted_reps` es hipertrofia: a diferencia de `reps` (gimnástico, sólo repeticiones),
 * cada marca lleva además el peso levantado — dos categorías con la misma forma de tabla
 * de porcentajes, pero una marca de distinta forma, así que no pueden compartir `kind`.
 */
export const measureKindSchema = z.enum(['rm', 'reps', 'weighted_reps', 'time']);
export type MeasureKind = z.infer<typeof measureKindSchema>;

/** Las cuatro categorías de los mockups (leyenda del mockup 12). */
export const exerciseCategorySchema = z.enum(['fuerza', 'hipertrofia', 'gimnastico', 'running']);
export type ExerciseCategory = z.infer<typeof exerciseCategorySchema>;

const MEASURE_BY_CATEGORY = {
  fuerza: 'rm',
  hipertrofia: 'weighted_reps',
  gimnastico: 'reps',
  running: 'time',
} as const satisfies Record<ExerciseCategory, MeasureKind>;

/**
 * La categoría define qué se mide; no se elige por separado (spec §5.1). Es la única
 * fuente de esta regla: nadie más guarda ni recalcula la medición de un ejercicio.
 */
export function measureKindFor(category: ExerciseCategory): MeasureKind {
  return MEASURE_BY_CATEGORY[category];
}

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

const capacitiesSchema = z
  .array(capacitySchema)
  .min(1, 'Elegí al menos una capacidad')
  .refine((values) => new Set(values).size === values.length, 'Capacidades repetidas');

const muscleGroupsSchema = z
  .array(muscleGroupSchema)
  .min(1, 'Elegí al menos un grupo muscular')
  .refine((values) => new Set(values).size === values.length, 'Grupos musculares repetidos');

/**
 * Lo que define un ejercicio: nombre y categoría. Es todo lo que pide el formulario de
 * "Nuevo ejercicio" para uno propio (mockup 9). El dueño y el ID los pone el servidor.
 *
 * Nivel, "con dolor" y comentarios **no** están acá: son del usuario sobre el ejercicio,
 * y viven en el ejercicio gestionado (spec §5.1).
 */
export const exerciseDefinitionSchema = z.object({
  name: plainText(80).pipe(z.string().min(1, 'El nombre no puede estar vacío')),
  category: exerciseCategorySchema,
});
export type ExerciseDefinition = z.infer<typeof exerciseDefinitionSchema>;

/**
 * Lo que define un ejercicio propio: además de nombre y categoría, las capacidades y los
 * grupos musculares que elige el usuario en el alta (spec §5.1). Sin ellos ese ejercicio
 * quedaría afuera de las estadísticas generales.
 *
 * El segmento del cuerpo no está: se deriva de los grupos con `bodySegmentFor`.
 */
export const customExerciseDefinitionSchema = exerciseDefinitionSchema.extend({
  capacities: capacitiesSchema,
  muscleGroups: muscleGroupsSchema,
});
export type CustomExerciseDefinition = z.infer<typeof customExerciseDefinitionSchema>;

/**
 * Una entrada del catálogo pre-cargado. Lo mismo que uno propio, más el segmento del
 * cuerpo, que en el catálogo viene cargado a mano.
 */
export const catalogExerciseDefinitionSchema = customExerciseDefinitionSchema.extend({
  bodySegment: bodySegmentSchema,
});
export type CatalogExerciseDefinition = z.infer<typeof catalogExerciseDefinitionSchema>;

export const exerciseSchema = exerciseDefinitionSchema
  .extend({
    id: exerciseIdSchema,
    /**
     * `null` = ejercicio del catálogo, visible para todos.
     * Con `userId` = ejercicio propio, visible sólo para su dueño.
     */
    ownerId: userIdSchema.nullable(),
    // Los lleva todo ejercicio, del catálogo o propio: son el eje de Estadísticas
    // (spec §5.1). En los propios el segmento sale de los grupos musculares.
    capacities: capacitiesSchema,
    muscleGroups: muscleGroupsSchema,
    bodySegment: bodySegmentSchema,
  })
  .extend(timestampsSchema.shape);

export type Exercise = z.infer<typeof exerciseSchema>;

/** Un ejercicio del catálogo no tiene dueño: lo ve todo el mundo. */
export function isCatalogExercise(exercise: Pick<Exercise, 'ownerId'>): boolean {
  return exercise.ownerId === null;
}
