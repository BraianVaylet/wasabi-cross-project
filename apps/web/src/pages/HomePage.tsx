import {
  type ExerciseList,
  type ManagedExerciseSummary,
  type MeasureKind,
  type SessionUser,
} from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronIcon, Measure, SectionHeader, Skeleton } from '@wasabi-cross/ui';
import { ErrorNotice } from '../app/ErrorNotice.tsx';
import { formatDate, markParts } from '../lib/format.ts';
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
  distance: 'Distancia',
  weighted_distance: 'Distancia',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Cuántos ejercicios hay, al lado del título: "03". Para el lector de pantalla, en palabras: un
 * "3" suelto no dice de qué. No hay tope en ningún plan (spec §4), así que es sólo la cuenta.
 */
function Count({ total }: { total: number }): React.JSX.Element {
  return (
    <>
      <span aria-hidden="true">{pad(total)}</span>
      <span className="wc-visually-hidden">
        {total === 1 ? '1 ejercicio' : `${String(total)} ejercicios`}
      </span>
    </>
  );
}

/** Home (mockup 4): la lista de ejercicios gestionados con su valor actual. */
export function HomePage({ user, exercises }: HomePageProps): React.JSX.Element {
  return (
    <>
      <SectionHeader
        level={1}
        title="Tus ejercicios"
        kicker={`¡Hola, ${user.name}!`}
        meta={exercises.data ? <Count total={exercises.data.exercises.length} /> : undefined}
      />

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

      <NewExercise />
    </>
  );
}

/** Cada fila, como las marcas anteriores del historial del diseño: recortada, con filo violeta. */
function ExerciseRow({ exercise }: { exercise: ManagedExerciseSummary }): React.JSX.Element {
  const value = markParts(exercise.current);

  return (
    <Link to="/ejercicios/$id" params={{ id: exercise.id }} className="home__row">
      <span className="home__row-main">
        <span className="home__row-name">{exercise.name}</span>
        <span className="home__row-date">
          {VALUE_LABEL[exercise.kind]} del {formatDate(exercise.current.performedAt)}
        </span>
      </span>
      <span className="home__row-value">
        <Measure value={value.value} unit={value.unit} size="md" />
        {value.extra ? <span className="home__row-extra">{value.extra}</span> : null}
      </span>
      <span aria-hidden="true" className="home__row-chevron">
        <ChevronIcon />
      </span>
    </Link>
  );
}

/** "Nuevo ejercicio" (mockup 4). Siempre habilitado: no hay tope de ejercicios (spec §4). */
function NewExercise(): React.JSX.Element {
  return (
    <Link to="/ejercicios/nuevo" className="wc-button wc-button--primary wc-button--block">
      Nuevo ejercicio
    </Link>
  );
}
