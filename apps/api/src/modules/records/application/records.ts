import {
  recordValueSchemaFor,
  type LogRecordResponse,
  type Mark,
  type RecordHistory,
  type RecordInput,
} from '@wasabi-cross/schemas';
import { AppError } from '../../../shared/errors/app-error.ts';
import type { HistoryCursor, OwnedExerciseLookup, RecordStore } from '../domain/record-ports.ts';

export interface RecordsDeps {
  lookup: OwnedExerciseLookup;
  store: RecordStore;
}

async function findOwnedOrFail(lookup: OwnedExerciseLookup, userId: string, id: string) {
  const owned = await lookup.findOwned(userId, id);
  if (!owned) {
    // Uno ajeno responde lo mismo que uno inexistente: 404, no 403 (spec §13).
    throw new AppError('WC-EXO-404-002', { meta: { userId, managedExerciseId: id } });
  }
  return owned;
}

async function currentAndBest(
  store: RecordStore,
  managedExerciseId: string,
  kind: Parameters<RecordStore['best']>[1],
): Promise<{ current: Mark; best: Mark }> {
  const current = await store.current(managedExerciseId);
  const best = await store.best(managedExerciseId, kind);

  // Todo ejercicio gestionado nace con su primera marca (F1-05): que no haya ninguna es
  // una base corrupta, no un caso de negocio.
  if (!current || !best) {
    throw new Error(`Ejercicio gestionado ${managedExerciseId} sin marcas`);
  }
  return { current, best };
}

/**
 * Carga una marca en la unidad que dicta la categoría del ejercicio (F1-07). Devuelve la
 * marca y cómo quedaron el valor actual y la mejor, para que la UI se actualice sin
 * volver a pedir el historial.
 */
export async function logRecord(
  deps: RecordsDeps,
  request: { userId: string; managedExerciseId: string; input: RecordInput },
): Promise<LogRecordResponse> {
  const { userId, managedExerciseId, input } = request;
  const owned = await findOwnedOrFail(deps.lookup, userId, managedExerciseId);

  const value = recordValueSchemaFor(owned.kind).safeParse(input.value);
  if (!value.success) {
    throw new AppError('WC-RM-422-001', {
      details: value.error.issues.map((issue) => ({ path: 'value', message: issue.message })),
      meta: { userId, managedExerciseId, kind: owned.kind, value: input.value },
    });
  }

  const record = await deps.store.append({
    userId,
    managedExerciseId: owned.managedExerciseId,
    kind: owned.kind,
    value: value.data,
    performedAt: input.performedAt ?? new Date().toISOString(),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  });

  return { record, ...(await currentAndBest(deps.store, owned.managedExerciseId, owned.kind)) };
}

/*
 * El cursor es opaco para el cliente: la posición exacta de la última marca de la página,
 * en base64url. Con un offset, una marca cargada mientras alguien pagina correría todo un
 * lugar y se repetiría o se saltearía una.
 */

function encodeCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(raw: string): HistoryCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'performedAt' in parsed &&
      'createdAt' in parsed &&
      'id' in parsed &&
      typeof parsed.performedAt === 'string' &&
      typeof parsed.createdAt === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return { performedAt: parsed.performedAt, createdAt: parsed.createdAt, id: parsed.id };
    }
  } catch {
    // Cae al error de abajo.
  }

  throw new AppError('WC-SYS-400-002', {
    details: [{ path: 'cursor', message: 'Cursor inválido' }],
  });
}

/** Una página del historial, la más reciente primero, con el valor actual y la mejor marca. */
export async function recordHistory(
  deps: RecordsDeps,
  request: { userId: string; managedExerciseId: string; limit: number; cursor?: string },
): Promise<RecordHistory> {
  const { userId, managedExerciseId, limit, cursor } = request;
  const owned = await findOwnedOrFail(deps.lookup, userId, managedExerciseId);
  const after = cursor === undefined ? undefined : decodeCursor(cursor);

  const page = await deps.store.page(owned.managedExerciseId, limit, after);
  const last = page.records.at(-1);

  return {
    records: page.records.map(({ createdAt: _createdAt, ...entry }) => entry),
    ...(await currentAndBest(deps.store, owned.managedExerciseId, owned.kind)),
    nextCursor:
      page.hasMore && last
        ? encodeCursor({ performedAt: last.performedAt, createdAt: last.createdAt, id: last.id })
        : null,
  };
}
