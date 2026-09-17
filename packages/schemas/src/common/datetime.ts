import { z } from 'zod';

/**
 * Las fechas viajan como ISO 8601 en UTC. Temporal se usa para operar con ellas dentro
 * de la app; en el borde viaja un string, que es lo único que sobrevive a JSON sin
 * ambigüedad de zona horaria.
 */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

/** Marcas de tiempo que lleva todo documento persistido. */
export const timestampsSchema = z.object({
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
