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

const VALUE_BY_KIND = {
  rm: rmValueSchema,
  reps: repsValueSchema,
  weighted_reps: repsValueSchema,
  time: timeValueSchema,
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
]);

export type ExerciseRecord = z.infer<typeof recordSchema>;

/**
 * Lo que manda el cliente al cargar una marca: valor, fecha y comentario, más el peso en
 * hipertrofia o el desnivel en running. El tipo de medición no viaja del cliente — lo sabe
 * el servidor por la categoría del ejercicio —, así que el schema se arma para ese tipo.
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
  return z.object(base);
}

export type CreateRecord = z.infer<ReturnType<typeof createRecordSchemaFor>>;
