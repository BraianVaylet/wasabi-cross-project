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

  function since(from: Date | null): Filter<SeriesRow & { managedExerciseId: string }> {
    // Las fechas se guardan en ISO, que ordena igual como texto que como fecha.
    return from ? { performedAt: { $gte: from.toISOString() } } : {};
  }

  return {
    series: async (managedExerciseId, from) => {
      const rows = await records
        .find(
          { managedExerciseId, ...since(from) },
          { projection: { _id: 0, performedAt: 1, value: 1 } },
        )
        // De la más vieja a la más reciente: es el orden en que se lee un gráfico.
        .sort({ performedAt: 1, createdAt: 1, _id: 1 })
        .toArray();

      return rows.map((row): SeriesPoint => ({ performedAt: row.performedAt, value: row.value }));
    },

    seriesFor: async (managedExerciseIds, from) => {
      const byExercise = new Map<string, SeriesPoint[]>();
      if (managedExerciseIds.length === 0) {
        return byExercise;
      }

      const rows = await records
        .find(
          { managedExerciseId: { $in: [...managedExerciseIds] }, ...since(from) },
          { projection: { _id: 0, managedExerciseId: 1, performedAt: 1, value: 1 } },
        )
        .sort({ managedExerciseId: 1, performedAt: 1, createdAt: 1, _id: 1 })
        .toArray();

      for (const row of rows) {
        const points = byExercise.get(row.managedExerciseId) ?? [];
        points.push({ performedAt: row.performedAt, value: row.value });
        byExercise.set(row.managedExerciseId, points);
      }

      return byExercise;
    },
  };
}
