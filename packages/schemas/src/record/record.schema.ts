import { z } from 'zod';
import {
  isoDateTimeSchema,
  notFutureDateTimeSchema,
  timestampsSchema,
} from '../common/datetime.ts';
import { managedExerciseIdSchema, recordIdSchema, userIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';
import type { MeasureKind } from '../exercise/exercise.schema.ts';

/** Cada medición tiene una sola unidad. El peso es sólo en kg (spec §5.1). */
export const UNIT_BY_KIND = {
  rm: 'kg',
  reps: 'reps',
  weighted_reps: 'reps',
  time: 's',
  distance: 'm',
} as const satisfies Record<MeasureKind, string>;

const rmValueSchema = z
  .number()
  .positive('El RM tiene que ser mayor a cero')
  .max(1000, 'Ese valor de RM no es realista');

const repsValueSchema = z
  .number()
  .int('Las repeticiones son un número entero')
  .positive('Las repeticiones tienen que ser más de cero')
  .max(10_000, 'Ese número de repeticiones no es realista');

/** Siempre en segundos. La UI decide si lo muestra como 3:42 o como 222 s. */
const timeValueSchema = z
  .number()
  .positive('El tiempo tiene que ser mayor a cero')
  .max(86_400, 'El tiempo no puede superar las 24 horas');

/** Metros enteros: una máquina de cardio no marca fracciones de metro. */
const distanceValueSchema = z
  .number()
  .int('Los metros son un número entero')
  .positive('La distancia tiene que ser mayor a cero')
  .max(100_000, 'Esa distancia no es realista');

const VALUE_BY_KIND = {
  rm: rmValueSchema,
  reps: repsValueSchema,
  weighted_reps: repsValueSchema,
  time: timeValueSchema,
  distance: distanceValueSchema,
} as const satisfies Record<MeasureKind, z.ZodNumber>;

/** Cómo se valida el valor de una marca según qué mide su ejercicio. */
export function recordValueSchemaFor(kind: MeasureKind): z.ZodNumber {
  return VALUE_BY_KIND[kind];
}

/** El peso de una marca de hipertrofia, siempre junto a las repeticiones (spec §5.1). */
export const weightKgSchema = z
  .number()
  .positive('El peso tiene que ser mayor a cero')
  .max(1000, 'Ese peso no es realista');

/** El desnivel de una marca de running, junto al tiempo. Una carrera plana es 0, no vacío. */
export const elevationGainMSchema = z
  .number()
  .nonnegative('El desnivel no puede ser negativo')
  .max(10_000, 'Ese desnivel no es realista');

/** Las calorías de una marca de cardio, junto a los metros. Siempre se cargan (spec §5.1). */
export const caloriesKcalSchema = z
  .number()
  .int('Las calorías son un número entero')
  .nonnegative('Las calorías no pueden ser negativas')
  .max(10_000, 'Esas calorías no son realistas');

/** El dato extra de una marca, además de su valor principal (spec §5.1). */
export type ExtraField = 'weightKg' | 'elevationGainM' | 'caloriesKcal';

const EXTRA_FIELD_BY_KIND = {
  rm: null,
  reps: null,
  weighted_reps: 'weightKg',
  time: 'elevationGainM',
  distance: 'caloriesKcal',
} as const satisfies Record<MeasureKind, ExtraField | null>;

/**
 * Qué dato extra lleva una marca de esta medición: el peso en hipertrofia, el desnivel en
 * running, las calorías en cardio. `null` si no lleva ninguno.
 */
export function extraFieldFor(kind: MeasureKind): ExtraField | null {
  return EXTRA_FIELD_BY_KIND[kind];
}

const EXTRA_FIELD_RULES: Record<ExtraField, { schema: z.ZodNumber; missing: string }> = {
  weightKg: { schema: weightKgSchema, missing: 'Cargá el peso' },
  elevationGainM: { schema: elevationGainMSchema, missing: 'Cargá el desnivel' },
  caloriesKcal: { schema: caloriesKcalSchema, missing: 'Cargá las calorías' },
};

export type ExtraFieldResult =
  | { ok: true; data: Partial<Record<ExtraField, number>> }
  | { ok: false; field: ExtraField; message: string };

/**
 * Valida el dato extra que le corresponde a esta medición, si alguno: no existe el estado
 * inválido de una marca de hipertrofia sin peso (spec §5.1). Los datos extra de otras
 * mediciones que lleguen se ignoran.
 *
 * Ausente e inválido son casos distintos: sin esto, un campo faltante mostraba el mensaje
 * en inglés de Zod ("Invalid input: expected number, received undefined") en una app en
 * español.
 */
export function parseExtraField(
  kind: MeasureKind,
  input: Readonly<Partial<Record<ExtraField, number | undefined>>>,
): ExtraFieldResult {
  const field = extraFieldFor(kind);
  if (field === null) {
    return { ok: true, data: {} };
  }

  const { schema, missing } = EXTRA_FIELD_RULES[field];
  const parsed = schema.safeParse(input[field]);
  if (!parsed.success) {
    return {
      ok: false,
      field,
      message: input[field] === undefined ? missing : (parsed.error.issues[0]?.message ?? missing),
    };
  }

  return { ok: true, data: { [field]: parsed.data } };
}

/**
 * La marca referencia al **ejercicio gestionado**, no al ejercicio compartido: es una
 * marca de este usuario sobre su entrada en la lista (spec §5.1).
 *
 * `userId` es redundante con el del ejercicio gestionado, a propósito: deja filtrar por
 * dueño en la misma consulta, que es la defensa contra IDOR (spec §13).
 */
const identity = z.object({
  id: recordIdSchema,
  userId: userIdSchema,
  managedExerciseId: managedExerciseIdSchema,
  /** Cuándo se hizo, que no siempre es cuándo se cargó. */
  performedAt: isoDateTimeSchema,
  notes: plainText(300).optional(),
});

/**
 * Unión discriminada por `kind`, con la unidad atada al tipo: no existe el estado
 * inválido de un RM medido en repeticiones.
 *
 * El tipo se llama `ExerciseRecord` y no `Record`: en TypeScript, `Record` es el tipo
 * utilitario `Record<K, V>`, y exportarlo con ese nombre lo pisaría en todo archivo que
 * importe de este paquete.
 */
export const recordSchema = z.discriminatedUnion('kind', [
  identity
    .extend({ kind: z.literal('rm'), value: rmValueSchema, unit: z.literal(UNIT_BY_KIND.rm) })
    .extend(timestampsSchema.shape),
  identity
    .extend({
      kind: z.literal('reps'),
      value: repsValueSchema,
      unit: z.literal(UNIT_BY_KIND.reps),
    })
    .extend(timestampsSchema.shape),
  identity
    .extend({
      kind: z.literal('weighted_reps'),
      value: repsValueSchema,
      unit: z.literal(UNIT_BY_KIND.weighted_reps),
      weightKg: weightKgSchema,
    })
    .extend(timestampsSchema.shape),
  identity
    .extend({
      kind: z.literal('time'),
      value: timeValueSchema,
      unit: z.literal(UNIT_BY_KIND.time),
      elevationGainM: elevationGainMSchema,
    })
    .extend(timestampsSchema.shape),
  identity
    .extend({
      kind: z.literal('distance'),
      value: distanceValueSchema,
      unit: z.literal(UNIT_BY_KIND.distance),
      caloriesKcal: caloriesKcalSchema,
    })
    .extend(timestampsSchema.shape),
]);

export type ExerciseRecord = z.infer<typeof recordSchema>;

/**
 * Lo que manda el cliente al cargar una marca: valor, fecha y comentario, más el peso en
 * hipertrofia, el desnivel en running o las calorías en cardio. El tipo de medición no
 * viaja del cliente — lo sabe el servidor por la categoría del ejercicio —, así que el
 * schema se arma para ese tipo.
 */
export function createRecordSchemaFor(kind: MeasureKind) {
  const base = {
    value: recordValueSchemaFor(kind),
    performedAt: notFutureDateTimeSchema.optional(),
    notes: plainText(300).optional(),
  };

  if (kind === 'weighted_reps') {
    return z.object({ ...base, weightKg: weightKgSchema });
  }
  if (kind === 'time') {
    return z.object({ ...base, elevationGainM: elevationGainMSchema });
  }
  if (kind === 'distance') {
    return z.object({ ...base, caloriesKcal: caloriesKcalSchema });
  }
  return z.object(base);
}

export type CreateRecord = z.infer<ReturnType<typeof createRecordSchemaFor>>;
