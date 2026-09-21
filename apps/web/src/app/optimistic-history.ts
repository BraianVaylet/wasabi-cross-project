import type { RecordEntry, RecordHistory } from '@wasabi-cross/schemas';
import type { InfiniteData } from '@tanstack/react-query';

export type HistoryPages = InfiniteData<RecordHistory, string | undefined>;

/**
 * Mete una marca recién cargada arriba de todo del historial que ya está en pantalla
 * (spec §11: optimistic UI). Sólo toca la primera página: las siguientes son más viejas.
 *
 * Si todavía no hay nada en caché devuelve `undefined`: no hay nada que adelantar, y el
 * historial se va a pedir igual cuando termine la carga.
 */
export function prependRecord(
  data: HistoryPages | undefined,
  record: RecordEntry,
): HistoryPages | undefined {
  const [first, ...rest] = data?.pages ?? [];
  if (!data || !first) {
    return undefined;
  }

  return {
    ...data,
    pages: [{ ...first, records: [record, ...first.records] }, ...rest],
  };
}

/** El id de una marca optimista: se reemplaza por la real cuando responde la API. */
export function optimisticId(): string {
  return `optimista-${String(Date.now())}`;
}
