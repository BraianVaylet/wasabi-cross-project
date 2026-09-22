import type { ExerciseStats, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Chart, ChevronIcon, Skeleton } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMark } from '../../lib/format.ts';
import './stats.css';

export interface StatsPageProps {
  exercises: UseQueryResult<{ exercises: ManagedExerciseSummary[] }>;
  /** Cuál está abierto, o `undefined` si están todos cerrados. Vive en la URL. */
  open: string | undefined;
  onToggle: (id: string) => void;
  /** La consulta del que está abierto. No hay más de una a la vez. */
  stats: UseQueryResult<ExerciseStats> | null;
}

/** Cómo se lee una variación: con signo, porque bajar también es un dato. */
function formatChange(percent: number): string {
  return `${percent > 0 ? '+' : ''}${String(percent)}%`;
}

/** Tus estadísticas (mockup 10): un acordeón de ejercicios con su evolución. */
export function StatsPage({ exercises, open, onToggle, stats }: StatsPageProps): React.JSX.Element {
  return (
    <>
      <Link to="/" className="page__back">
        <span aria-hidden="true">‹</span> Ejercicios
      </Link>
      <h1 className="page__title">Tus estadísticas</h1>

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
        <ul className="stats__list">
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

  return (
    <>
      <Chart label={`Evolución de ${stats.name}`} unit={stats.unit} points={points} />

      {stats.summary ? (
        <dl className="stats__numbers" data-testid="numeros">
          <div>
            <dt>Actual</dt>
            <dd>{formatMark({ value: stats.summary.current, unit: stats.unit })}</dd>
          </div>
          <div>
            <dt>Mejor</dt>
            <dd>{formatMark({ value: stats.summary.best, unit: stats.unit })}</dd>
          </div>
          <div>
            <dt>Peor</dt>
            <dd>{formatMark({ value: stats.summary.worst, unit: stats.unit })}</dd>
          </div>
          <div>
            <dt>Variación</dt>
            <dd>{formatChange(stats.summary.changePercent)}</dd>
          </div>
        </dl>
      ) : null}
    </>
  );
}
