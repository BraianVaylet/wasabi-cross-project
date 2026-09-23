import {
  capacitySchema,
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  levelSchema,
  measureKindFor,
  muscleGroupSchema,
  sameName,
  type AddExercise,
  type Capacity,
  type Exercise,
  type ExerciseCategory,
  type Level,
  type MeasureKind,
  type MuscleGroup,
} from '@wasabi-cross/schemas';
import { z } from 'zod';
import {
  elevationError,
  extraFieldKindFor,
  markValueError,
  parseMarkValue,
  parsePlainNumber,
  performedAtFrom,
  weightError,
} from '../../lib/mark-input.ts';

/*
 * El formulario de "Nuevo ejercicio" (mockup 9), aparte de la pantalla: qué se valida y
 * qué viaja a la API. Así se prueba sin renderizar nada.
 */

export interface NewExerciseValues {
  name: string;
  /** Vacío hasta que haga falta: uno del catálogo ya trae la suya. */
  category: ExerciseCategory | '';
  /** Sólo para uno propio: del catálogo ya vienen cargadas (spec §5.1). */
  capacities: Capacity[];
  muscleGroups: MuscleGroup[];
  /** Como se escribe: "100", "92,5" o "4:32". */
  value: string;
  /** El peso (hipertrofia) o el desnivel (running) de la primera marca, si corresponde. */
  extra: string;
  /** `yyyy-mm-dd` del campo de fecha, o vacío. */
  date: string;
  level: Level | '';
  notes: string;
  withPain: boolean;
}

export const EMPTY_VALUES: NewExerciseValues = {
  name: '',
  category: '',
  capacities: [],
  muscleGroups: [],
  value: '',
  extra: '',
  date: '',
  level: '',
  notes: '',
  withPain: false,
};

/** El ejercicio del catálogo que se llama así, si existe. */
export function catalogMatch(catalog: readonly Exercise[], name: string): Exercise | undefined {
  return name.trim() === '' ? undefined : catalog.find((exercise) => sameName(exercise.name, name));
}

/**
 * Qué mide lo que se está cargando: si el nombre es uno del catálogo lo dice el catálogo,
 * y si es uno propio, la categoría elegida. `null` mientras no se sepa.
 */
export function kindFor(
  catalog: readonly Exercise[],
  name: string,
  category: ExerciseCategory | '',
): MeasureKind | null {
  const match = catalogMatch(catalog, name);
  if (match) {
    return measureKindFor(match.category);
  }
  return category === '' ? null : measureKindFor(category);
}

/**
 * Lo que se valida antes de llamar a la API. Depende del catálogo: el mismo formulario
 * pide categoría o no según el nombre que se haya escrito.
 */
export function newExerciseSchemaFor(catalog: readonly Exercise[]) {
  return z
    .object({
      name: exerciseDefinitionSchema.shape.name,
      category: z.union([exerciseCategorySchema, z.literal('')]),
      capacities: z.array(capacitySchema),
      muscleGroups: z.array(muscleGroupSchema),
      value: z.string().min(1, 'Cargá tu marca'),
      extra: z.string(),
      date: z.string(),
      level: levelSchema,
      notes: z.string(),
      withPain: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const match = catalogMatch(catalog, values.name);

      if (!match) {
        if (values.category === '') {
          ctx.addIssue({ code: 'custom', path: ['category'], message: 'Elegí una categoría' });
          return;
        }

        // Sin esto el ejercicio quedaría afuera de las estadísticas generales (spec §5.1).
        if (values.capacities.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['capacities'],
            message: 'Elegí al menos una capacidad',
          });
        }
        if (values.muscleGroups.length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['muscleGroups'],
            message: 'Elegí al menos un grupo muscular',
          });
        }
      }

      const kind = kindFor(catalog, values.name, values.category);
      if (parseMarkValue(kind, values.value) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: markValueError(kind ?? 'rm'),
        });
      }

      const extraKind = extraFieldKindFor(kind);
      if (extraKind !== null && parsePlainNumber(values.extra) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['extra'],
          message: extraKind === 'weightKg' ? weightError : elevationError,
        });
      }
    });
}

/** Lo que viaja a la API: uno del catálogo por su ID, o uno propio con su categoría. */
export function toAddExercise(
  catalog: readonly Exercise[],
  values: NewExerciseValues,
): AddExercise {
  const match = catalogMatch(catalog, values.name);
  const kind = kindFor(catalog, values.name, values.category);
  const performedAt = performedAtFrom(values.date);
  const notes = values.notes.trim();
  const extraKind = extraFieldKindFor(kind);
  const extraValue = extraKind === null ? null : parsePlainNumber(values.extra);

  const shared = {
    level: values.level === '' ? 'principiante' : values.level,
    withPain: values.withPain,
    ...(notes === '' ? {} : { notes }),
    firstRecord: {
      value: parseMarkValue(kind, values.value) ?? 0,
      ...(performedAt === undefined ? {} : { performedAt }),
      ...(extraKind === null || extraValue === null ? {} : { [extraKind]: extraValue }),
    },
  };

  return match
    ? { source: 'catalog', exerciseId: match.id, ...shared }
    : {
        source: 'custom',
        name: values.name.trim(),
        category: values.category === '' ? 'fuerza' : values.category,
        // El segmento del cuerpo no va: lo deriva el servidor (spec §5.1).
        capacities: values.capacities,
        muscleGroups: values.muscleGroups,
        ...shared,
      };
}
