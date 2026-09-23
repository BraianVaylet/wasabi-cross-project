import {
  ERROR_CATALOG,
  type ExerciseList,
  type ManagedExerciseSummary,
  type MeasureKind,
  type PlanUsage,
  type SessionUser,
} from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button, ChevronIcon, Skeleton } from '@wasabi-cross/ui';
import { ErrorNotice } from '../app/ErrorNotice.tsx';
import { formatDate, formatMark } from '../lib/format.ts';
import './home.css';

export interface HomePageProps {
  user: SessionUser;
  exercises: UseQueryResult<ExerciseList>;
}

/** Cómo se llama el valor actual según lo que mide el ejercicio (spec §5.1). */
const VALUE_LABEL: Record<MeasureKind, string> = {
  rm: 'RM',
  reps: 'Reps',
  weighted_reps: 'Reps',
  time: 'Tiempo',
};

/** Home (mockup 4): la lista de ejercicios gestionados con su valor actual. */
export function HomePage({ user, exercises }: HomePageProps): React.JSX.Element {
  return (
    <>
      <p className="page__greeting">¡Hola, {user.name}!</p>
      <h1 className="page__title">Tus ejercicios</h1>

      {exercises.isPending ? <Skeleton label="Cargando tus ejercicios" count={4} /> : null}

      {exercises.isError ? (
        <ErrorNotice
          error={exercises.error}
          onRetry={() => {
            void exercises.refetch();
          }}
        />
      ) : null}

      {exercises.data ? <ExerciseList list={exercises.data} /> : null}
    </>
  );
}

function ExerciseList({ list }: { list: ExerciseList }): React.JSX.Element {
  if (list.exercises.length === 0) {
    return (
      <div className="home__empty">
        <p>Todavía no tenés ejercicios</p>
        <Link to="/ejercicios/nuevo" className="wc-button wc-button--primary wc-button--block">
          Agregar el primero
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="home__list">
        {list.exercises.map((exercise) => (
          <li key={exercise.id}>
            <ExerciseRow exercise={exercise} />
          </li>
        ))}
      </ul>

      <NewExercise usage={list.usage} />
    </>
  );
}

function ExerciseRow({ exercise }: { exercise: ManagedExerciseSummary }): React.JSX.Element {
  return (
    <Link to="/ejercicios/$id" params={{ id: exercise.id }} className="home__row">
      <span className="home__row-main">
        <span className="home__row-name">{exercise.name}</span>
        <span className="home__row-date">
          {VALUE_LABEL[exercise.kind]} del {formatDate(exercise.current.performedAt)}
        </span>
      </span>
      <span className="home__row-value">{formatMark(exercise.current)}</span>
      <span aria-hidden="true" className="home__row-chevron">
        <ChevronIcon />
      </span>
    </Link>
  );
}

/**
 * "Nuevo ejercicio" (mockup 4). En el límite del plan queda deshabilitado y dice por qué:
 * quien decide igual es el backend (spec §4), esto es sólo para no hacer perder el viaje.
 */
function NewExercise({ usage }: { usage: PlanUsage }): React.JSX.Element {
  const full = usage.maxTotal !== null && usage.total >= usage.maxTotal;

  if (!full) {
    return (
      <Link to="/ejercicios/nuevo" className="wc-button wc-button--primary wc-button--block">
        Nuevo ejercicio
      </Link>
    );
  }

  const reason = ERROR_CATALOG['WC-SUBS-403-001'].userMessage
    .replace('{limite}', String(usage.maxTotal))
    .replace('{plan}', usage.plan === 'max' ? 'Max' : 'Free');

  return (
    <div className="home__full">
      <p className="home__full-reason" id="home-plan-lleno">
        {reason}
      </p>
      <Button block disabled aria-describedby="home-plan-lleno">
        Nuevo ejercicio
      </Button>
    </div>
  );
}
