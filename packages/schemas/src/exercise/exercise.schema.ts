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
export const measureKindSchema = z.enum([
  'rm',
  'reps',
  'weighted_reps',
  'time',
  'distance',
  'weighted_distance',
]);
export type MeasureKind = z.infer<typeof measureKindSchema>;

/**
 * Las categorías (spec §5.1): las cuatro de los mockups (leyenda del mockup 12), y cardio y
 * distancia con carga, que llegaron con el catálogo ampliado (ADR-0009).
 */
export const exerciseCategorySchema = z.enum([
  'fuerza',
  'hipertrofia',
  'gimnastico',
  'running',
  'cardio',
  'distancia_carga',
]);
export type ExerciseCategory = z.infer<typeof exerciseCategorySchema>;

const MEASURE_BY_CATEGORY = {
  fuerza: 'rm',
  hipertrofia: 'weighted_reps',
  gimnastico: 'reps',
  running: 'time',
  cardio: 'distance',
  distancia_carga: 'weighted_distance',
} as const satisfies Record<ExerciseCategory, MeasureKind>;

/**
 * La categoría define qué se mide; no se elige por separado (spec §5.1). Es la única
 * fuente de esta regla: nadie más guarda ni recalcula la medición de un ejercicio.
 */
export function measureKindFor(category: ExerciseCategory): MeasureKind {
  return MEASURE_BY_CATEGORY[category];
}

/** Capacidad que entrena. Es el eje de las estadísticas generales (spec §5). */
export const capacitySchema = z.enum(['fuerza', 'potencia', 'resistencia', 'velocidad']);
export type Capacity = z.infer<typeof capacitySchema>;

export const muscleGroupSchema = z.enum([
  'pectoral',
  'espalda',
  'espalda_baja',
  'trapecio',
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

/**
 * El contexto de entrenamiento (spec §5.1). Un ejercicio puede tener más de una: el Wall
 * Ball es de crossfit y de hyrox. No cambia qué se mide: eso lo decide sólo la categoría.
 */
export const disciplineSchema = z.enum(['gimnasio', 'crossfit', 'hyrox', 'funcional', 'running']);
export type Discipline = z.infer<typeof disciplineSchema>;

/** Con qué se hace. Uno por ejercicio; sirve para buscar en el catálogo (spec §5.3). */
export const equipmentSchema = z.enum([
  'barra',
  'barra_dominadas',
  'barra_dominadas_o_anillas',
  'mancuerna',
  'kettlebell',
  'polea',
  'maquina',
  'balon_medicinal',
  'caja',
  'cuerda',
  'cuerda_de_saltar',
  'cuerda_battle',
  'remoergometro',
  'bicicleta_assault',
  'skierg',
  'sled',
  'sandbag',
  'trx',
  'banda_elastica',
  'sin_equipo',
]);
export type Equipment = z.infer<typeof equipmentSchema>;

/**
 * La clave estable de un ejercicio del catálogo (`back-squat`): el seed la usa para saber
 * qué ya existe, así un renombre no duplica el ejercicio (ADR-0009).
 */
export const catalogKeySchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'La clave va en minúsculas, con guiones');

const disciplinesSchema = z
  .array(disciplineSchema)
  .refine((values) => new Set(values).size === values.length, 'Disciplinas repetidas');

/**
 * El grupo primario encabeza la lista de grupos (spec §5.1). La lista completa es la que
 * cuenta Estadísticas; el primario es el que da el segmento. Que vaya primero hace
 * imposible que los dos digan cosas distintas.
 */
function primaryLeadsMuscleGroups(
  value: { primaryMuscleGroup: MuscleGroup; muscleGroups: readonly MuscleGroup[] },
  ctx: z.RefinementCtx,
): void {
  if (value.muscleGroups[0] !== value.primaryMuscleGroup) {
    ctx.addIssue({
      code: 'custom',
      path: ['primaryMuscleGroup'],
      message: 'El grupo primario tiene que encabezar los grupos musculares',
    });
  }
}

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
 * El segmento del cuerpo no está: se deriva del grupo primario con `bodySegmentFor`. Hasta
 * que el alta lo pida (F5-08), el primario de uno propio es el primero de sus grupos.
 */
export const customExerciseDefinitionSchema = exerciseDefinitionSchema.extend({
  capacities: capacitiesSchema,
  muscleGroups: muscleGroupsSchema,
});
export type CustomExerciseDefinition = z.infer<typeof customExerciseDefinitionSchema>;

/**
 * Una entrada del catálogo pre-cargado (spec §5.3). Además de lo de uno propio, trae su
 * clave, el grupo primario, las disciplinas y el equipo, que en el catálogo son
 * obligatorios: son con lo que se busca.
 *
 * El segmento del cuerpo no está: se deriva del grupo primario con `bodySegmentFor`.
 */
export const catalogExerciseDefinitionSchema = customExerciseDefinitionSchema
  .extend({
    catalogKey: catalogKeySchema,
    primaryMuscleGroup: muscleGroupSchema,
    disciplines: disciplinesSchema.min(1, 'Elegí al menos una disciplina'),
    equipment: equipmentSchema,
  })
  .superRefine(primaryLeadsMuscleGroups);
export type CatalogExerciseDefinition = z.infer<typeof catalogExerciseDefinitionSchema>;

export const exerciseSchema = exerciseDefinitionSchema
  .extend({
    id: exerciseIdSchema,
    /**
     * `null` = ejercicio del catálogo, visible para todos.
     * Con `userId` = ejercicio propio, visible sólo para su dueño.
     */
    ownerId: userIdSchema.nullable(),
    /** Sólo en los del catálogo: la clave con la que los reconoce el seed. */
    catalogKey: catalogKeySchema.optional(),
    // Los lleva todo ejercicio, del catálogo o propio: son el eje de Estadísticas
    // (spec §5.1). El segmento sale del grupo primario.
    capacities: capacitiesSchema,
    primaryMuscleGroup: muscleGroupSchema,
    muscleGroups: muscleGroupsSchema,
    bodySegment: bodySegmentSchema,
    // En el catálogo vienen cargados; en uno propio son opcionales (spec §5.1).
    disciplines: disciplinesSchema,
    equipment: equipmentSchema.optional(),
  })
  .extend(timestampsSchema.shape)
  .superRefine(primaryLeadsMuscleGroups);

export type Exercise = z.infer<typeof exerciseSchema>;

/** Un ejercicio del catálogo no tiene dueño: lo ve todo el mundo. */
export function isCatalogExercise(exercise: Pick<Exercise, 'ownerId'>): boolean {
  return exercise.ownerId === null;
}
