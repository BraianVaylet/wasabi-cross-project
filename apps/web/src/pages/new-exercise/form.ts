import {
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  levelSchema,
  measureKindFor,
  sameName,
  type AddExercise,
  type Exercise,
  type ExerciseCategory,
  type Level,
  type MeasureKind,
} from '@wasabi-cross/schemas';
import { z } from 'zod';
import { parseDuration } from '../../lib/format.ts';

/*
 * El formulario de "Nuevo ejercicio" (mockup 9), aparte de la pantalla: qué se valida y
 * qué viaja a la API. Así se prueba sin renderizar nada.
 */

export interface NewExerciseValues {
  name: string;
  /** Vacío hasta que haga falta: uno del catálogo ya trae la suya. */
  category: ExerciseCategory | '';
  /** Como se escribe: "100", "92,5" o "4:32". */
  value: string;
  /** `yyyy-mm-dd` del campo de fecha, o vacío. */
  date: string;
  level: Level | '';
  notes: string;
  withPain: boolean;
}

export const EMPTY_VALUES: NewExerciseValues = {
  name: '',
  category: '',
  value: '',
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

function parseValue(kind: MeasureKind | null, value: string): number | null {
  if (kind === 'time') {
    return parseDuration(value);
  }

  const parsed = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
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
      value: z.string().min(1, 'Cargá tu marca'),
      date: z.string(),
      level: levelSchema,
      notes: z.string(),
      withPain: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const match = catalogMatch(catalog, values.name);

      if (!match && values.category === '') {
        ctx.addIssue({ code: 'custom', path: ['category'], message: 'Elegí una categoría' });
        return;
      }

      const kind = kindFor(catalog, values.name, values.category);
      if (parseValue(kind, values.value) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message:
            kind === 'time'
              ? 'Escribilo como mm:ss, por ejemplo 4:32'
              : 'Cargá un número, como 100',
        });
      }
    });
}

/**
 * La fecha elegida, al mediodía de la zona del usuario: a medianoche, un huso negativo la
 * correría al día anterior.
 */
function performedAtFrom(date: string): string | undefined {
  return date === '' ? undefined : new Date(`${date}T12:00:00`).toISOString();
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

  const shared = {
    level: values.level === '' ? 'principiante' : values.level,
    withPain: values.withPain,
    ...(notes === '' ? {} : { notes }),
    firstRecord: {
      value: parseValue(kind, values.value) ?? 0,
      ...(performedAt === undefined ? {} : { performedAt }),
    },
  };

  return match
    ? { source: 'catalog', exerciseId: match.id, ...shared }
    : {
        source: 'custom',
        name: values.name.trim(),
        category: values.category === '' ? 'fuerza' : values.category,
        ...shared,
      };
}
