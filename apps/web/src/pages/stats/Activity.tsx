import { STALE_AFTER_DAYS, type TrainingActivity } from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ColumnChart, Measure, SectionHeader, Skeleton } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMonth } from '../../lib/format.ts';
import { formatChange } from './change.ts';

export interface ActivityProps {
  activity: UseQueryResult<TrainingActivity>;
}

/** Cuántos días, dichos como se dicen: "hoy", "ayer", "hace 9 días". */
function daysAgo(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${String(days)} días`;
}

/**
 * Constancia, récords y para retestear (spec §5.4). Las dos primeras miran el período de
 * arriba; los días desde la última marca y la lista para retestear, todo el historial.
 */
export function Activity({ activity }: ActivityProps): React.JSX.Element {
  if (activity.isPending) {
    return <Skeleton label="Cargando tu constancia" count={2} />;
  }

  if (activity.isError) {
    return <ErrorNotice error={activity.error} />;
  }

  const { data } = activity;
  // Con más de un año en el eje, el mes lleva el año: si no, hay dos "oct".
  const withYear = data.byMonth.length > 12;

  return (
    <>
      <section className="stats__general" aria-labelledby="stats-constancia">
        <SectionHeader id="stats-constancia" title="Constancia" meta="Del período" />

        <dl className="stats__numbers" data-testid="constancia">
          <div>
            <dt>Marcas</dt>
            <dd>
              <Measure value={data.records} size="md" />
            </dd>
          </div>
          <div>
            <dt>Récords nuevos</dt>
            <dd>
              <Measure
                value={data.personalBests}
                size="md"
                tone={data.personalBests > 0 ? 'accent' : 'default'}
              />
            </dd>
          </div>
          {data.daysSinceLast === null ? null : (
            <div className="stats__numbers-wide">
              <dt>Última marca</dt>
              <dd className="stats__last">{daysAgo(data.daysSinceLast)}</dd>
            </div>
          )}
        </dl>

        <div className="stats__chart">
          <ColumnChart
            label="Marcas por mes"
            columnLabel="Mes"
            valueLabel="Marcas"
            columns={data.byMonth.map((month) => ({
              key: month.month,
              label: formatMonth(month.month, withYear),
              value: month.records,
            }))}
          />
        </div>
      </section>

      <section className="stats__general" aria-labelledby="stats-mejoras">
        <SectionHeader id="stats-mejoras" title="Lo que más mejoró" meta="Del período" />

        {data.topImprovements.length === 0 ? (
          <p className="stats__general-missing">
            Todavía no hay mejoras en este período: hacen falta dos marcas de un mismo ejercicio.
          </p>
        ) : (
          <ol className="stats__general-list">
            {data.topImprovements.map((entry) => (
              <li key={entry.id}>
                <Link
                  to="/ejercicios/$id"
                  params={{ id: entry.id }}
                  search={{}}
                  className="stats__general-row stats__link"
                >
                  <span className="stats__general-label">{entry.name}</span>
                  <span className="stats__general-change">{formatChange(entry.changePercent)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      {data.stale.length === 0 ? null : (
        <section className="stats__general" aria-labelledby="stats-retestear">
          <SectionHeader
            id="stats-retestear"
            title="Para retestear"
            meta={`Más de ${String(STALE_AFTER_DAYS / 7)} semanas`}
          />

          <ul className="stats__general-list">
            {data.stale.map((entry) => (
              <li key={entry.id}>
                <Link
                  to="/ejercicios/$id"
                  params={{ id: entry.id }}
                  search={{}}
                  className="stats__general-row stats__link"
                >
                  <span className="stats__general-label">{entry.name}</span>
                  <span className="stats__general-count">
                    Última marca el {formatDate(entry.lastRecordAt)}, {daysAgo(entry.days)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
