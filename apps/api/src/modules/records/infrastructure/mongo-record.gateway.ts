import {
  UNIT_BY_KIND,
  parseExtraField,
  recordValueSchemaFor,
  type ExtraField,
  type Mark,
  type MeasureKind,
  type RecordEntry,
} from '@wasabi-cross/schemas';
import type { ClientSession, Db, Filter, Sort } from 'mongodb';
import { AppError } from '../../../shared/errors/app-error.ts';
import { generateId } from '../../../shared/ids.ts';
import type { HistoryCursor, NewRecordEntry, RecordStore } from '../domain/record-ports.ts';

export const RECORDS_COLLECTION = 'records';

interface RecordDocument {
  _id: string;
  userId: string;
  managedExerciseId: string;
  kind: MeasureKind;
  value: number;
  unit: Mark['unit'];
  performedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  weightKg?: number;
  elevationGainM?: number;
  caloriesKcal?: number;
}

const EXTRA_FIELDS = [
  'weightKg',
  'elevationGainM',
  'caloriesKcal',
] as const satisfies readonly ExtraField[];

/**
 * Los datos extra que tiene la marca, sin los ausentes. `$first` de un campo que falta en
 * el grupo da `null`, no `undefined`: sin filtrarlo, una marca sin peso llegaba con
 * `weightKg: null` y rompía la respuesta contra `markSchema`, que sólo acepta número u
 * omitido.
 */
function extrasOf(
  source: Readonly<Partial<Record<ExtraField, number | null | undefined>>>,
): Partial<Record<ExtraField, number>> {
  const extras: Partial<Record<ExtraField, number>> = {};
  for (const field of EXTRA_FIELDS) {
    const value = source[field];
    if (value != null) {
      extras[field] = value;
    }
  }
  return extras;
}

/*
 * El orden del historial, más reciente primero. Si dos marcas tienen la misma fecha de
 * realización, gana la que se cargó después; el ID deja el orden total, que es lo que
 * necesita el cursor. Lo cubre el índice `managed_history`.
 */
const NEWEST_FIRST: Sort = { performedAt: -1, createdAt: -1, _id: -1 };

function toDocument(record: NewRecordEntry): RecordDocument {
  // Segunda red: el caso de uso ya validó, pero este módulo es el dueño de las marcas y
  // no guarda una que no respete su medición.
  const value = recordValueSchemaFor(record.kind).safeParse(record.value);
  if (!value.success) {
    throw new AppError('WC-RM-422-001', { meta: { kind: record.kind, value: record.value } });
  }

  // Misma segunda red para el dato extra (peso, desnivel o calorías): no existe el estado
  // inválido de una marca de esa medición sin su campo.
  const extra = parseExtraField(record.kind, record);
  if (!extra.ok) {
    throw new AppError('WC-RM-422-001', {
      meta: { kind: record.kind, [extra.field]: record[extra.field] },
    });
  }

  const now = new Date().toISOString();
  return {
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
    ...extra.data,
  };
}

function toMark(document: RecordDocument): Mark {
  return {
    value: document.value,
    unit: document.unit,
    performedAt: document.performedAt,
    ...extrasOf(document),
  };
}

function toEntry(document: RecordDocument): RecordEntry {
  return {
    id: document._id,
    ...toMark(document),
    ...(document.notes === undefined ? {} : { notes: document.notes }),
  };
}

/** Las marcas estrictamente después del cursor, en el orden del historial. */
function after(cursor: HistoryCursor): Filter<RecordDocument> {
  return {
    $or: [
      { performedAt: { $lt: cursor.performedAt } },
      { performedAt: cursor.performedAt, createdAt: { $lt: cursor.createdAt } },
      { performedAt: cursor.performedAt, createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
    ],
  };
}

/**
 * Las marcas de un ejercicio gestionado. Cumple dos puertos sin importarlos: el
 * `RecordsGateway` de `exercises` (primera marca, valor actual, borrado en cascada) y el
 * `RecordStore` de `records` (F1-07). La compatibilidad la chequea TypeScript en la raíz
 * de composición.
 */
export function createMongoRecordGateway(db: Db) {
  const records = db.collection<RecordDocument>(RECORDS_COLLECTION);

  const store: RecordStore = {
    append: async (record) => {
      const document = toDocument(record);
      await records.insertOne(document);
      return toEntry(document);
    },

    current: async (managedExerciseId) => {
      const document = await records.findOne({ managedExerciseId }, { sort: NEWEST_FIRST });
      return document ? toMark(document) : null;
    },

    best: async (managedExerciseId, kind) => {
      // En hipertrofia, la de mayor RM estimado: 10 × 80 kg y 6 × 90 kg sólo se comparan así
      // (spec §5.1). Con la fórmula de `estimatedOneRm`, escrita como expresión de Mongo: con
      // una repetición el RM es el peso.
      if (kind === 'weighted_reps') {
        const [best] = await records
          .aggregate<RecordDocument>([
            { $match: { managedExerciseId } },
            {
              $addFields: {
                estimatedRm: {
                  $cond: [
                    { $eq: ['$value', 1] },
                    '$weightKg',
                    { $multiply: ['$weightKg', { $add: [1, { $divide: ['$value', 30] }] }] },
                  ],
                },
              },
            },
            { $sort: { estimatedRm: -1, performedAt: 1, createdAt: 1, _id: 1 } },
            { $limit: 1 },
          ])
          .toArray();
        return best ? toMark(best) : null;
      }

      // En tiempo, menos es mejor; en el resto, más. Si la mejor se repite, cuenta la primera vez que se
      // logró. Un ejercicio tiene decenas de marcas, no miles: ordenar en memoria las de
      // uno solo, que el índice ya filtra, no justifica otro índice.
      const document = await records.findOne(
        { managedExerciseId },
        { sort: { value: kind === 'time' ? 1 : -1, performedAt: 1, createdAt: 1, _id: 1 } },
      );
      return document ? toMark(document) : null;
    },

    page: async (managedExerciseId, limit, cursor) => {
      // Uno de más para saber si hay otra página sin contar todo.
      const documents = await records
        .find(
          cursor === undefined ? { managedExerciseId } : { managedExerciseId, ...after(cursor) },
          { sort: NEWEST_FIRST, limit: limit + 1 },
        )
        .toArray();

      return {
        records: documents
          .slice(0, limit)
          .map((document) => ({ ...toEntry(document), createdAt: document.createdAt })),
        hasMore: documents.length > limit,
      };
    },
  };

  return {
    ...store,

    logFirst: async (session: ClientSession, record: NewRecordEntry): Promise<Mark> => {
      const document = toDocument(record);
      await records.insertOne(document, { session });
      return toMark(document);
    },

    deleteAllFor: async (session: ClientSession, managedExerciseId: string) => {
      const result = await records.deleteMany({ managedExerciseId }, { session });
      return result.deletedCount;
    },

    currentFor: async (managedExerciseIds: readonly string[]) => {
      // El valor actual es la marca de fecha de realización más reciente (spec §5.1), con
      // el mismo desempate que el historial.
      const rows = await records
        .aggregate<Mark & { _id: string }>([
          { $match: { managedExerciseId: { $in: [...managedExerciseIds] } } },
          { $sort: NEWEST_FIRST },
          {
            $group: {
              _id: '$managedExerciseId',
              value: { $first: '$value' },
              unit: { $first: '$unit' },
              performedAt: { $first: '$performedAt' },
              weightKg: { $first: '$weightKg' },
              elevationGainM: { $first: '$elevationGainM' },
              caloriesKcal: { $first: '$caloriesKcal' },
            },
          },
        ])
        .toArray();

      return new Map(
        rows.map((row) => [
          row._id,
          {
            value: row.value,
            unit: row.unit,
            performedAt: row.performedAt,
            ...extrasOf(row),
          },
        ]),
      );
    },
  };
}
