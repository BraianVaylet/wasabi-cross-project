import {
  elevationGainMSchema,
  recordValueSchemaFor,
  weightKgSchema,
  type LogRecordResponse,
  type Mark,
  type MeasureKind,
  type RecordHistory,
  type RecordInput,
} from '@wasabi-cross/schemas';
import { AppError } from '../../../shared/errors/app-error.ts';
import type { HistoryCursor, OwnedExerciseLookup, RecordStore } from '../domain/record-ports.ts';

/**
 * El peso (hipertrofia) o el desnivel (running) que le corresponde a esta medición, si
 * alguno: no existe el estado inválido de una marca de hipertrofia sin peso (spec §5.1).
 */
function extraFieldFor(
  kind: MeasureKind,
  input: RecordInput,
):
  | { ok: true; data: { weightKg?: number; elevationGainM?: number } }
  | { ok: false; path: 'weightKg' | 'elevationGainM'; message: string } {
  if (kind === 'weighted_reps') {
    const parsed = weightKgSchema.safeParse(input.weightKg);
    if (!parsed.success) {
      return {
        ok: false,
        path: 'weightKg',
        message: parsed.error.issues[0]?.message ?? 'Peso inválido',
      };
    }
    return { ok: true, data: { weightKg: parsed.data } };
  }
  if (kind === 'time') {
    const parsed = elevationGainMSchema.safeParse(input.elevationGainM);
    if (!parsed.success) {
      return {
        ok: false,
        path: 'elevationGainM',
        message: parsed.error.issues[0]?.message ?? 'Desnivel inválido',
      };
    }
    return { ok: true, data: { elevationGainM: parsed.data } };
  }
  return { ok: true, data: {} };
}

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

  const extra = extraFieldFor(owned.kind, input);
  if (!extra.ok) {
    throw new AppError('WC-RM-422-001', {
      details: [{ path: extra.path, message: extra.message }],
      meta: { userId, managedExerciseId, kind: owned.kind },
    });
  }

  const record = await deps.store.append({
    userId,
    managedExerciseId: owned.managedExerciseId,
    kind: owned.kind,
    value: value.data,
    performedAt: input.performedAt ?? new Date().toISOString(),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
    ...extra.data,
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
