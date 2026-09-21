import type { Mark, RecordEntry } from '@wasabi-cross/schemas';
import { Button, Skeleton, Tag } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMark } from '../../lib/format.ts';

export interface HistoryProps {
  /** Las marcas ya juntadas de todas las páginas traídas, más reciente primero. */
  records: RecordEntry[];
  /** La mejor marca: se muestra en tiempo, donde no hay tabla de porcentajes (spec §5.1). */
  best: Mark | undefined;
  showBest: boolean;
  loading: boolean;
  error: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
}

/** El historial del detalle (mockup 6): las marcas con su fecha, la actual marcada. */
export function History({
  records,
  best,
  showBest,
  loading,
  error,
  hasMore,
  loadingMore,
  onMore,
}: HistoryProps): React.JSX.Element {
  return (
    <section className="history" aria-labelledby="history-title">
      {showBest && best ? (
        <p className="history__best" data-testid="mejor-marca">
          <span className="history__best-label">Mejor marca</span>
          <span className="history__best-value">{formatMark(best)}</span>
          <span className="history__best-date">{formatDate(best.performedAt)}</span>
        </p>
      ) : null}

      <h2 id="history-title" className="history__title">
        Historial
      </h2>

      {loading ? <Skeleton label="Cargando el historial" count={3} /> : null}
      {error ? <ErrorNotice error={error} /> : null}

      {!loading && !error && records.length === 0 ? (
        <p className="history__empty">Todavía no hay marcas cargadas.</p>
      ) : null}

      {records.length > 0 ? (
        <ul className="history__list" aria-label="Historial">
          {records.map((record, index) => (
            <li key={record.id} className="history__item">
              <span className="history__date">{formatDate(record.performedAt)}</span>
              {/* La primera es la de fecha más reciente: el valor actual (spec §5.1). */}
              {index === 0 ? <Tag variant="solid">actual</Tag> : null}
              <span className="history__value">{formatMark(record)}</span>
            </li>
          ))}
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
