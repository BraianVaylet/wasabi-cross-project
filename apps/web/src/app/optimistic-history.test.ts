import type { RecordEntry } from '@wasabi-cross/schemas';
import { describe, expect, it } from 'vitest';
import { prependRecord, type HistoryPages } from './optimistic-history.ts';

const marca: RecordEntry = {
  id: 'rec_nueva',
  value: 105,
  unit: 'kg',
  performedAt: '2026-07-10T12:00:00.000Z',
};

const paginas: HistoryPages = {
  pageParams: [undefined, 'cursor-2'],
  pages: [
    {
      records: [{ id: 'rec_1', value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' }],
      current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
      best: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
      nextCursor: 'cursor-2',
    },
    {
      records: [{ id: 'rec_2', value: 80, unit: 'kg', performedAt: '2026-02-23T12:00:00.000Z' }],
      current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
      best: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
      nextCursor: null,
    },
  ],
};

describe('prependRecord — la marca optimista (spec §11)', () => {
  it('la pone arriba de todo, que es donde va a quedar', () => {
    const resultado = prependRecord(paginas, marca);

    expect(resultado?.pages[0]?.records.map((record) => record.id)).toEqual(['rec_nueva', 'rec_1']);
  });

  it('no toca las páginas viejas', () => {
    const resultado = prependRecord(paginas, marca);

    expect(resultado?.pages[1]).toEqual(paginas.pages[1]);
    expect(resultado?.pageParams).toEqual(paginas.pageParams);
  });

  it('no modifica lo que había: el rollback necesita el original intacto', () => {
    prependRecord(paginas, marca);

    expect(paginas.pages[0]?.records).toHaveLength(1);
  });

  it('sin nada en caché no inventa una página', () => {
    expect(prependRecord(undefined, marca)).toBeUndefined();
    expect(prependRecord({ pageParams: [], pages: [] }, marca)).toBeUndefined();
  });
});
