import { z } from 'zod';
import { isoDateTimeSchema, timestampsSchema } from '../common/datetime.ts';
import { exerciseIdSchema, recordIdSchema, userIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';

export const weightUnitSchema = z.enum(['kg', 'lb']);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

const identity = z.object({
  id: recordIdSchema,
  userId: userIdSchema,
  exerciseId: exerciseIdSchema,
  /** Cuándo se hizo, que no siempre es cuándo se cargó. */
  performedAt: isoDateTimeSchema,
  notes: plainText(300).optional(),
});

/**
 * Un registro mide una sola cosa, y qué cosa lo dice `kind`. Es una unión discriminada
 * y no un `value` suelto con un `unit` libre: así no existe el estado inválido de un
 * RM medido en repeticiones.
 */
const rmRecordSchema = identity.extend({
  kind: z.literal('rm'),
  value: z
    .number()
    .positive('El RM tiene que ser mayor a cero')
    .max(1000, 'Ese valor de RM no es realista'),
  unit: weightUnitSchema,
});

const timeRecordSchema = identity.extend({
  kind: z.literal('time'),
  /** Siempre en segundos. La UI decide si lo muestra como 3:42 o como 222 s. */
  value: z
    .number()
    .positive('El tiempo tiene que ser mayor a cero')
    .max(86_400, 'El tiempo no puede superar las 24 horas'),
  unit: z.literal('s'),
});

const repsRecordSchema = identity.extend({
  kind: z.literal('reps'),
  value: z
    .number()
    .int('Las repeticiones son un número entero')
    .positive('Las repeticiones tienen que ser más de cero')
    .max(10_000, 'Ese número de repeticiones no es realista'),
  unit: z.literal('reps'),
});

/**
 * El tipo se llama `ExerciseRecord` y no `Record`: en TypeScript, `Record` es el tipo
 * utilitario `Record<K, V>`, y exportarlo con ese nombre lo pisaría en todo archivo que
 * importe de este paquete. El concepto de la spec no cambia, sólo el nombre del tipo.
 *
 * Los timestamps se agregan a cada variante en vez de intersecar el union entero, para
 * que siga siendo una unión discriminada — que es lo que necesita el generador de
 * OpenAPI para emitir un `oneOf` con discriminador en vez de un `allOf` ilegible.
 */
export const recordSchema = z.discriminatedUnion('kind', [
  rmRecordSchema.extend(timestampsSchema.shape),
  timeRecordSchema.extend(timestampsSchema.shape),
  repsRecordSchema.extend(timestampsSchema.shape),
]);

export type ExerciseRecord = z.infer<typeof recordSchema>;

/**
 * Lo que manda el cliente al cargar un registro. No trae `id` ni `userId` (los pone el
 * servidor desde la sesión) ni `exerciseId`: ese viaja en la ruta
 * `POST /exercises/:exerciseId/records`, así no hay dos fuentes para el mismo dato.
 */
const CLIENT_PROVIDED = { id: true, userId: true, exerciseId: true, performedAt: true } as const;

export const createRecordSchema = z.discriminatedUnion('kind', [
  rmRecordSchema.omit(CLIENT_PROVIDED).extend({ performedAt: isoDateTimeSchema.optional() }),
  timeRecordSchema.omit(CLIENT_PROVIDED).extend({ performedAt: isoDateTimeSchema.optional() }),
  repsRecordSchema.omit(CLIENT_PROVIDED).extend({ performedAt: isoDateTimeSchema.optional() }),
]);

export type CreateRecord = z.infer<typeof createRecordSchema>;

/**
 * Unidad que le corresponde a cada tipo de medición. `rm` no está acá porque es la
 * única que el usuario elige (kg o lb).
 */
export const FIXED_UNIT_BY_KIND = { time: 's', reps: 'reps' } as const;
