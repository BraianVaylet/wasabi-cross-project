import { z } from 'zod';
import { isoDateTimeSchema, notFutureDateTimeSchema } from '../common/datetime.ts';
import { recordIdSchema } from '../common/ids.ts';
import { plainText } from '../common/text.ts';

/*
 * Contratos HTTP de las marcas (F1-07). El valor se valida recién en el servidor, con la
 * regla de su medición: el cliente no manda el tipo, lo sabe el servidor por la categoría.
 *
 * `weightKg` (hipertrofia) y `elevationGainM` (running) viajan opcionales acá —el wire es
 * el mismo para toda medición, como `value`— y el servidor exige el que corresponda según
 * `createRecordSchemaFor(kind)` (spec §5.1).
 */

export const recordUnitSchema = z.enum(['kg', 'reps', 's']);

/** Lo que manda el modal de "New RM" / "New Record" (mockup 11). */
export const recordInputSchema = z.object({
  value: z.number(),
  performedAt: notFutureDateTimeSchema.optional(),
  notes: plainText(300).optional(),
  weightKg: z.number().optional(),
  elevationGainM: z.number().optional(),
});

export type RecordInput = z.infer<typeof recordInputSchema>;

/** Un valor con su unidad y su fecha: el valor actual, la mejor marca. */
export const markSchema = z.object({
  value: z.number(),
  unit: recordUnitSchema,
  performedAt: isoDateTimeSchema,
  weightKg: z.number().optional(),
  elevationGainM: z.number().optional(),
});

export type Mark = z.infer<typeof markSchema>;

export const recordEntrySchema = markSchema.extend({
  id: recordIdSchema,
  notes: z.string().optional(),
});

export type RecordEntry = z.infer<typeof recordEntrySchema>;

/** La paginación del historial. `limit` llega como texto en la URL. */
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(200).optional(),
});

/**
 * Una página del historial, más reciente primero, con el valor actual y la mejor marca
 * (spec §5.1). `nextCursor` es `null` en la última página.
 */
export const recordHistorySchema = z.object({
  records: z.array(recordEntrySchema),
  current: markSchema,
  best: markSchema,
  nextCursor: z.string().nullable(),
});

export type RecordHistory = z.infer<typeof recordHistorySchema>;

/** Lo que responde cargar una marca: la marca, y cómo quedaron el valor actual y la mejor. */
export const logRecordResponseSchema = z.object({
  record: recordEntrySchema,
  current: markSchema,
  best: markSchema,
});

export type LogRecordResponse = z.infer<typeof logRecordResponseSchema>;
