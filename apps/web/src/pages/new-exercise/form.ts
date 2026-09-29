import {
  capacitySchema,
  disciplineSchema,
  equipmentSchema,
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  levelSchema,
  measureKindFor,
  muscleGroupSchema,
  nameMatches,
  sameDefinition,
  sameName,
  type AddExercise,
  type Capacity,
  type Discipline,
  type Equipment,
  type Exercise,
  type ExerciseCategory,
  type ExerciseDefinitionInput,
  type Level,
  type MeasureKind,
  type MuscleGroup,
} from '@wasabi-cross/schemas';
import { z } from 'zod';
import {
  EXTRA_FIELD,
  extraFieldKindFor,
  markValueError,
  parseMarkValue,
  parsePlainNumber,
  performedAtFrom,
} from '../../lib/mark-input.ts';

/*
 * El formulario de "Nuevo ejercicio" (mockup 9), aparte de la pantalla: qué se valida y
 * qué viaja a la API. Así se prueba sin renderizar nada.
 *
 * Es uno solo para las dos pestañas (spec §5.3). En "Crear" arranca vacío; en "Catálogo",
 * elegir uno lo llena con su definición, y desde ahí se puede editar. Qué es lo que se agrega
 * —el precargado tal cual o uno propio— no lo decide el nombre: lo decide `catalogId` y si la
 * definición cambió.
 */

export interface NewExerciseValues {
  /** El precargado del que se partió, o vacío en uno creado de cero. */
  catalogId: string;
  name: string;
  category: ExerciseCategory | '';
  capacities: Capacity[];
  /** Uno solo: da el segmento del cuerpo. Vacío hasta que se elige. */
  primaryMuscleGroup: MuscleGroup | '';
  secondaryMuscleGroups: MuscleGroup[];
  /** Opcionales, como el equipo: en uno propio no son obligatorios (spec §5.1). */
  disciplines: Discipline[];
  equipment: Equipment | '';
  /** Como se escribe: "100", "92,5" o "4:32". */
  value: string;
  /** El dato extra de la primera marca, si corresponde: peso, desnivel o calorías. */
  extra: string;
  /** `yyyy-mm-dd` del campo de fecha, o vacío. */
  date: string;
  level: Level | '';
  notes: string;
  withPain: boolean;
}

/** Los campos que definen al ejercicio: lo que cambia un precargado en uno propio. */
export type DefinitionValues = Pick<
  NewExerciseValues,
  | 'name'
  | 'category'
  | 'capacities'
  | 'primaryMuscleGroup'
  | 'secondaryMuscleGroups'
  | 'disciplines'
  | 'equipment'
>;

export const EMPTY_VALUES: NewExerciseValues = {
  catalogId: '',
  name: '',
  category: '',
  capacities: [],
  primaryMuscleGroup: '',
  secondaryMuscleGroups: [],
  disciplines: [],
  equipment: '',
  value: '',
  extra: '',
  date: '',
  level: '',
  notes: '',
  withPain: false,
};

/** La definición de un precargado, tal como la muestra el formulario. */
export function definitionValuesOf(exercise: Exercise): DefinitionValues {
  return {
    name: exercise.name,
    category: exercise.category,
    capacities: [...exercise.capacities],
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    secondaryMuscleGroups: exercise.muscleGroups.filter(
      (group) => group !== exercise.primaryMuscleGroup,
    ),
    disciplines: [...exercise.disciplines],
    ...(exercise.equipment === undefined ? { equipment: '' } : { equipment: exercise.equipment }),
  };
}

/** Elegir uno del catálogo: el formulario vacío con su definición cargada. */
export function valuesFromCatalog(exercise: Exercise): NewExerciseValues {
  return { ...EMPTY_VALUES, ...definitionValuesOf(exercise), catalogId: exercise.id };
}

/**
 * La definición que viaja a la API, o `null` mientras falte algo. El equipo se omite si no se
 * eligió: en la API es opcional, no una cadena vacía.
 */
export function definitionOf(values: DefinitionValues): ExerciseDefinitionInput | null {
  if (values.category === '' || values.primaryMuscleGroup === '') {
    return null;
  }

  return {
    name: values.name.trim(),
    category: values.category,
    capacities: values.capacities,
    primaryMuscleGroup: values.primaryMuscleGroup,
    secondaryMuscleGroups: values.secondaryMuscleGroups,
    disciplines: values.disciplines,
    ...(values.equipment === '' ? {} : { equipment: values.equipment }),
  };
}

/**
 * ¿Se cambió algo de la definición del precargado elegido? Con la misma regla con la que el
 * servidor decide si lo agrega tal cual o crea uno propio (`sameDefinition`).
 */
export function isEdited(exercise: Exercise, values: NewExerciseValues): boolean {
  const definition = definitionOf(values);

  // Sin categoría o sin primario es que se los borró: eso también es una edición.
  return definition === null || !sameDefinition(exercise, definition);
}

/** El precargado que se llama como lo que se está escribiendo, si existe. Sólo para avisar. */
export function catalogNameMatch(catalog: readonly Exercise[], name: string): Exercise | undefined {
  return name.trim() === '' ? undefined : catalog.find((exercise) => sameName(exercise.name, name));
}

/** Qué mide lo que se está cargando: lo dice la categoría. `null` mientras no se la elija. */
export function kindFor(category: ExerciseCategory | ''): MeasureKind | null {
  return category === '' ? null : measureKindFor(category);
}

/**
 * Lo que se valida antes de llamar a la API. El servidor vuelve a validar todo: esto es para
 * decirle al usuario qué le falta sin ir y volver.
 */
export const newExerciseSchema = z
  .object({
    catalogId: z.string(),
    name: exerciseDefinitionSchema.shape.name,
    category: z.union([exerciseCategorySchema, z.literal('')]),
    capacities: z.array(capacitySchema),
    primaryMuscleGroup: z.union([muscleGroupSchema, z.literal('')]),
    secondaryMuscleGroups: z.array(muscleGroupSchema),
    disciplines: z.array(disciplineSchema),
    equipment: z.union([equipmentSchema, z.literal('')]),
    value: z.string().min(1, 'Cargá tu marca'),
    extra: z.string(),
    date: z.string(),
    level: levelSchema,
    notes: z.string(),
    withPain: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.category === '') {
      ctx.addIssue({ code: 'custom', path: ['category'], message: 'Elegí una categoría' });
    }

    // Sin esto el ejercicio quedaría afuera de las estadísticas generales (spec §5.1).
    if (values.capacities.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['capacities'],
        message: 'Elegí al menos una capacidad',
      });
    }
    if (values.primaryMuscleGroup === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['primaryMuscleGroup'],
        message: 'Elegí el grupo muscular primario',
      });
    } else if (values.secondaryMuscleGroups.includes(values.primaryMuscleGroup)) {
      ctx.addIssue({
        code: 'custom',
        path: ['secondaryMuscleGroups'],
        message: 'El grupo primario no se repite como secundario',
      });
    }

    const kind = kindFor(values.category);
    if (kind !== null && parseMarkValue(kind, values.value) === null) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: markValueError(kind) });
    }

    const extraKind = extraFieldKindFor(kind);
    if (extraKind !== null && parsePlainNumber(values.extra) === null) {
      ctx.addIssue({ code: 'custom', path: ['extra'], message: EXTRA_FIELD[extraKind].error });
    }
  });

/**
 * Lo que viaja a la API: uno del catálogo por su ID con la definición como quedó (el
 * servidor decide si cambió), o uno propio con toda su definición.
 */
export function toAddExercise(values: NewExerciseValues): AddExercise {
  const kind = kindFor(values.category);
  const performedAt = performedAtFrom(values.date);
  const notes = values.notes.trim();
  const extraKind = extraFieldKindFor(kind);
  const extraValue = extraKind === null ? null : parsePlainNumber(values.extra);
  // La validación ya exigió categoría y primario: el respaldo nunca se usa.
  const definition = definitionOf(values) ?? {
    name: values.name.trim(),
    category: 'fuerza',
    capacities: values.capacities,
    primaryMuscleGroup: 'cuerpo_completo',
    secondaryMuscleGroups: [],
    disciplines: [],
  };

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

  return values.catalogId === ''
    ? { source: 'custom', ...definition, ...shared }
    : { source: 'catalog', exerciseId: values.catalogId, definition, ...shared };
}

/** Los ejercicios del catálogo que cumplen el buscador y la disciplina de la pestaña Catálogo. */
export function filterCatalog<T extends Exercise>(
  catalog: readonly T[],
  query: string,
  discipline: Discipline | null,
): T[] {
  return catalog.filter(
    (exercise) =>
      (query.trim() === '' || nameMatches(exercise.name, query)) &&
      (discipline === null || exercise.disciplines.includes(discipline)),
  );
}
