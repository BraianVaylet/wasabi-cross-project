import type {
  ExerciseStats,
  GeneralStats as Summary,
  ManagedExerciseSummary,
  StatsPeriod,
} from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Chart, ChevronIcon, Measure, RadioGroup, Skeleton } from '@wasabi-cross/ui';
import { useCallback } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMark, markParts } from '../../lib/format.ts';
import { formatChange } from './change.ts';
import { GeneralStats } from './GeneralStats.tsx';
import './stats.css';

export interface StatsPageProps {
  exercises: UseQueryResult<{ exercises: ManagedExerciseSummary[] }>;
  /** Cuál está abierto, o `undefined` si están todos cerrados. Vive en la URL. */
  open: string | undefined;
  onToggle: (id: string) => void;
  /** La consulta del que está abierto. No hay más de una a la vez. */
  stats: UseQueryResult<ExerciseStats> | null;
  /** El resumen por capacidad y grupo muscular (F2-08). */
  general: UseQueryResult<Summary>;
  period: StatsPeriod;
  onPeriodChange: (period: StatsPeriod) => void;
}

/** Las cuatro ventanas de tiempo del resumen (F2-01). */
const PERIODS: readonly { value: StatsPeriod; label: string }[] = [
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Último año' },
  { value: 'todo', label: 'Todo el historial' },
];

function isPeriod(value: string): value is StatsPeriod {
  return PERIODS.some((period) => period.value === value);
}

/** Tus estadísticas (mockup 10): un acordeón de ejercicios con su evolución. */
export function StatsPage({
  exercises,
  open,
  onToggle,
  stats,
  general,
  period,
  onPeriodChange,
}: StatsPageProps): React.JSX.Element {
  return (
    <>
      <Link to="/" className="page__back">
        <span aria-hidden="true">‹</span> Ejercicios
      </Link>
      <h1 className="page__title">Tus estadísticas</h1>

      {/* En casilleros y no en un desplegable: son cuatro, y se ven todos de un vistazo. */}
      <div className="stats__period">
        <RadioGroup
          legend="Período"
          name="periodo"
          value={period}
          options={PERIODS}
          onChange={(value) => {
            if (isPeriod(value)) {
              onPeriodChange(value);
            }
          }}
        />
      </div>

      {exercises.isPending ? <Skeleton label="Cargando tus ejercicios" count={4} /> : null}
      {exercises.isError ? (
        <ErrorNotice
          error={exercises.error}
          onRetry={() => {
            void exercises.refetch();
          }}
        />
      ) : null}

      {exercises.data?.exercises.length === 0 ? (
        <div className="home__empty">
          <p>Todavía no tenés ejercicios</p>
          <Link to="/ejercicios/nuevo" className="wc-button wc-button--primary wc-button--block">
            Agregar el primero
          </Link>
        </div>
      ) : null}

      {exercises.data && exercises.data.exercises.length > 0 ? (
        <ul className="stats__list" aria-label="Ejercicios">
          {exercises.data.exercises.map((exercise) => (
            <li key={exercise.id}>
              <Row
                exercise={exercise}
                open={exercise.id === open}
                onToggle={() => {
                  onToggle(exercise.id);
                }}
                stats={exercise.id === open ? stats : null}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {exercises.data && exercises.data.exercises.length > 0 ? (
        <GeneralStats stats={general} />
      ) : null}
    </>
  );
}

interface RowProps {
  exercise: ManagedExerciseSummary;
  open: boolean;
  onToggle: () => void;
  stats: UseQueryResult<ExerciseStats> | null;
}

function Row({ exercise, open, onToggle, stats }: RowProps): React.JSX.Element {
  const panelId = `stats-panel-${exercise.id}`;

  return (
    <div className={`stats__row${open ? ' stats__row--open' : ''}`}>
      <button
        type="button"
        className="stats__head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="stats__name">{exercise.name}</span>
        {/* La flecha del mockup: apunta abajo cerrada y arriba abierta, por CSS. */}
        <span className="stats__chevron" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <div id={panelId} className="stats__panel">
          {stats?.isPending ? <Skeleton label={`Cargando ${exercise.name}`} count={2} /> : null}
          {stats?.isError ? <ErrorNotice error={stats.error} /> : null}
          {stats?.data ? <Evolution stats={stats.data} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Evolution({ stats }: { stats: ExerciseStats }): React.JSX.Element {
  const points = stats.series.map((point) => ({
    label: formatDate(point.performedAt),
    value: point.value,
  }));
  // El gráfico escribe cada valor: como en el resto de la app, un tiempo en mm:ss y los
  // decimales con coma. Estable, así el dibujo no se arma de nuevo en cada render.
  const { unit } = stats;
  const formatValue = useCallback((value: number) => formatMark({ value, unit }), [unit]);

  return (
    <>
      <Chart
        label={`Evolución de ${stats.name}`}
        // Un tiempo se escribe 4:32: "UNIDAD: S" diría otra cosa que lo que se ve.
        unit={unit === 's' ? 'mm:ss' : unit}
        points={points}
        formatValue={formatValue}
      />

      {stats.summary ? (
        <dl className="stats__numbers" data-testid="numeros">
          <StatNumber label="Actual" value={stats.summary.current} unit={stats.unit} />
          <StatNumber label="Mejor" value={stats.summary.best} unit={stats.unit} />
          <StatNumber label="Peor" value={stats.summary.worst} unit={stats.unit} />
          <div>
            <dt>Variación</dt>
            <dd>
              <Measure
                value={formatChange(stats.summary.changePercent)}
                size="md"
                tone={stats.summary.changePercent > 0 ? 'accent' : 'default'}
              />
            </dd>
          </div>
        </dl>
      ) : null}
    </>
  );
}

/** Un número del resumen con su unidad chica, como los del detalle. */
function StatNumber({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: ExerciseStats['unit'];
}): React.JSX.Element {
  const parts = markParts({ value, unit });

  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <Measure value={parts.value} unit={parts.unit} size="md" />
      </dd>
    </div>
  );
}
