import { UNIT_BY_KIND, recordValueSchemaFor, type MeasureKind } from '@wasabi-cross/schemas';
import type { ClientSession, Db } from 'mongodb';
import { AppError } from '../../../shared/errors/app-error.ts';
import { generateId } from '../../../shared/ids.ts';

export const RECORDS_COLLECTION = 'records';

interface RecordDocument {
  _id: string;
  userId: string;
  managedExerciseId: string;
  kind: MeasureKind;
  value: number;
  unit: 'kg' | 'reps' | 's';
  performedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CurrentValue {
  value: number;
  unit: 'kg' | 'reps' | 's';
  performedAt: string;
}

/**
 * Lo mínimo del módulo `records` que necesita el alta de ejercicios (F1-05): guardar la
 * primera marca y leer el valor actual. El historial, la mejor marca y la carga de marcas
 * nuevas llegan con F1-07.
 *
 * Cumple el puerto `RecordsGateway` de `exercises` sin importarlo: la compatibilidad la
 * chequea TypeScript en la raíz de composición.
 */
export function createMongoRecordGateway(db: Db) {
  const records = db.collection<RecordDocument>(RECORDS_COLLECTION);

  return {
    logFirst: async (
      session: ClientSession,
      record: {
        userId: string;
        managedExerciseId: string;
        kind: MeasureKind;
        value: number;
        performedAt: string;
        notes?: string;
      },
    ): Promise<CurrentValue> => {
      // Segunda red: el caso de uso ya validó, pero este módulo es el dueño de las marcas
      // y no guarda una que no respete su medición.
      const value = recordValueSchemaFor(record.kind).safeParse(record.value);
      if (!value.success) {
        throw new AppError('WC-RM-422-001', { meta: { kind: record.kind, value: record.value } });
      }

      const now = new Date().toISOString();
      const document: RecordDocument = {
        _id: generateId('rec'),
        userId: record.userId,
        managedExerciseId: record.managedExerciseId,
        kind: record.kind,
        value: value.data,
        unit: UNIT_BY_KIND[record.kind],
        // Normalizada a UTC: las fechas se ordenan como texto, y "…T10:00-03:00" contra
        // "…T12:00Z" ordenaría mal aunque sean el mismo instante.
        performedAt: new Date(record.performedAt).toISOString(),
        createdAt: now,
        updatedAt: now,
        ...(record.notes === undefined ? {} : { notes: record.notes }),
      };

      await records.insertOne(document, { session });

      return { value: document.value, unit: document.unit, performedAt: document.performedAt };
    },

    currentFor: async (managedExerciseIds: readonly string[]) => {
      // El valor actual es la marca de fecha de realización más reciente (spec §5.1). Si
      // hay dos con la misma fecha, gana la que se cargó después.
      const rows = await records
        .aggregate<CurrentValue & { _id: string }>([
          { $match: { managedExerciseId: { $in: [...managedExerciseIds] } } },
          { $sort: { performedAt: -1, createdAt: -1 } },
          {
            $group: {
              _id: '$managedExerciseId',
              value: { $first: '$value' },
              unit: { $first: '$unit' },
              performedAt: { $first: '$performedAt' },
            },
          },
        ])
        .toArray();

      return new Map(
        rows.map((row) => [
          row._id,
          { value: row.value, unit: row.unit, performedAt: row.performedAt },
        ]),
      );
    },
  };
}
