import { z } from 'zod';

/**
 * Las fechas viajan como ISO 8601 en UTC. Temporal se usa para operar con ellas dentro
 * de la app; en el borde viaja un string, que es lo único que sobrevive a JSON sin
 * ambigüedad de zona horaria.
 */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/** Margen para el reloj del dispositivo, que puede ir adelantado respecto del servidor. */
export const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Una fecha que ya pasó: la de realización de una marca (spec §5.1). Una marca de mañana
 * pasaría a ser el valor actual antes de existir. Compara el instante, no el texto: el
 * offset cuenta.
 */
export const notFutureDateTimeSchema = isoDateTimeSchema.refine(
  (value) => Date.parse(value) <= Date.now() + CLOCK_SKEW_TOLERANCE_MS,
  'La fecha no puede ser futura',
);

/** Marcas de tiempo que lleva todo documento persistido. */
export const timestampsSchema = z.object({
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
