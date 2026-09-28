import type { MeasureKind, RecordEntry } from '@wasabi-cross/schemas';
import { Button, Card, Measure, SectionHeader, Skeleton } from '@wasabi-cross/ui';
import { useId } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, markParts } from '../../lib/format.ts';

export interface HistoryProps {
  /** Las marcas ya juntadas de todas las páginas traídas, más reciente primero. */
  records: RecordEntry[];
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
}

/** "03 registros", como en el diseño; "01 registro" en singular. */
function countText(count: number): string {
  return `${String(count).padStart(2, '0')} ${count === 1 ? 'registro' : 'registros'}`;
}

/**
 * El historial del detalle (spec §5.2, zona 5): las marcas con su fecha, la actual resaltada y
 * las anteriores más sobrias. La cantidad sale del resumen de la evolución (todo el historial),
 * no de las páginas traídas: con "Ver más" pendiente, contarlas daría de menos.
 */
export function History({
  records,
  loading,
  error,
  hasMore,
  loadingMore,
  onMore,
  kind,
  count,
}: HistoryProps & { kind: MeasureKind; count: number | undefined }): React.JSX.Element {
  const titleId = useId();
  const isRm = kind === 'rm';

  return (
    <section className="history" aria-labelledby={titleId}>
      <SectionHeader
        id={titleId}
        title={isRm ? 'Historial de RM' : 'Historial'}
        meta={count === undefined ? undefined : countText(count)}
      />

      {loading ? <Skeleton label="Cargando el historial" count={3} /> : null}
      {error ? <ErrorNotice error={error} /> : null}

      {!loading && !error && records.length === 0 ? (
        <p className="history__empty">Todavía no hay marcas cargadas.</p>
      ) : null}

      {records.length > 0 ? (
        <ul className="history__list" aria-label="Historial">
          {records.map((record, index) => {
            // La primera es la de fecha más reciente: el valor actual (spec §5.1).
            const current = index === 0;
            const parts = markParts(record);

            return (
              <li key={record.id}>
                <Card variant={current ? 'current' : 'past'} className="history__item">
                  <span className="history__when">
                    <span className="history__date">{formatDate(record.performedAt)}</span>
                    {current ? (
                      <span className="wc-kicker history__current">
                        {isRm ? 'RM actual' : 'Marca actual'}
                      </span>
                    ) : null}
                  </span>
                  <span className="history__mark">
                    <Measure value={parts.value} unit={parts.unit} size="md" />
                    {parts.extra ? <span className="history__extra">{parts.extra}</span> : null}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}

      {hasMore ? (
        <Button variant="secondary" block disabled={loadingMore} onClick={onMore}>
          Ver más
        </Button>
      ) : null}
    </section>
  );
}
