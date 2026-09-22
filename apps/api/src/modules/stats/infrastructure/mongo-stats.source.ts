import type { SeriesPoint } from '@wasabi-cross/schemas';
import type { Db, Filter } from 'mongodb';
import { RECORDS_COLLECTION } from '../../records/infrastructure/mongo-record.gateway.ts';
import type { StatsRecordSource } from '../domain/stats-ports.ts';

/*
 * La serie de marcas para las estadísticas. Lee la colección de `records` —el nombre, que
 * es infraestructura compartida— pero no su modelo ni sus casos de uso: acá sólo salen
 * fecha y valor, que es lo que dibuja un gráfico.
 */

interface SeriesRow {
  performedAt: string;
  value: number;
}

export function createMongoStatsSource(db: Db): StatsRecordSource {
  const records = db.collection<SeriesRow & { managedExerciseId: string }>(RECORDS_COLLECTION);

  return {
    series: async (managedExerciseId, from) => {
      const filter: Filter<SeriesRow & { managedExerciseId: string }> = { managedExerciseId };
      if (from) {
        // Las fechas se guardan en ISO, que ordena igual como texto que como fecha.
        filter.performedAt = { $gte: from.toISOString() };
      }

      const rows = await records
        .find(filter, { projection: { _id: 0, performedAt: 1, value: 1 } })
        // De la más vieja a la más reciente: es el orden en que se lee un gráfico.
        .sort({ performedAt: 1, createdAt: 1, _id: 1 })
        .toArray();

      return rows.map((row): SeriesPoint => ({ performedAt: row.performedAt, value: row.value }));
    },
  };
}
