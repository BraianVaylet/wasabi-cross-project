import {
  loadBandFor,
  percentageTable,
  supportsPercentages,
  type LoadBand,
  type ManagedExerciseSummary,
  type MeasureKind,
  type PercentageRow,
} from '@wasabi-cross/schemas';
import { Link } from '@tanstack/react-router';
import { Skeleton, Tag, TextField } from '@wasabi-cross/ui';
import { useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMark } from '../../lib/format.ts';
import { parsePercentage } from './percentage.ts';
import './exercise-detail.css';

export interface ExerciseDetailPageProps {
  exercise: ManagedExerciseSummary | undefined;
  /** Los porcentajes del perfil del usuario (F1-16). */
  percentages: number[];
  loading: boolean;
  error: unknown;
  /** El porcentaje elegido vive en la URL, así un link lleva a la misma carga. */
  selected: number | undefined;
  onSelect: (percentage: number) => void;
}

const CATEGORY_LABEL = {
  fuerza: 'Fuerza',
  hipertrofia: 'Hipertrofia',
  gimnastico: 'Gimnástico',
  running: 'Running',
} as const;

const LEVEL_LABEL = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  elite: 'Elite',
} as const;

const BAND_LABEL: Record<LoadBand, string> = {
  liviana: 'Carga liviana',
  media: 'Carga media',
  pesada: 'Carga pesada',
};

/** Cómo se llama el valor actual según lo que mide el ejercicio (spec §5.1). */
const VALUE_LABEL: Record<MeasureKind, string> = { rm: 'RM', reps: 'Reps', time: 'Tiempo' };

function targetText(kind: MeasureKind, target: number): string {
  return kind === 'rm' ? `${String(target)} kg` : `${String(target)} reps`;
}

/** Detalle de un ejercicio (mockups 5 y 6). El historial llega con F1-13b. */
export function ExerciseDetailPage({
  exercise,
  percentages,
  loading,
  error,
  selected,
  onSelect,
}: ExerciseDetailPageProps): React.JSX.Element {
  return (
    <>
      <Link to="/" className="page__back">
        <span aria-hidden="true">‹</span> Ejercicios
      </Link>

      {loading ? <Skeleton label="Cargando el ejercicio" count={3} /> : null}
      {error ? <ErrorNotice error={error} /> : null}

      {!loading && !error && !exercise ? (
        <div className="detail__missing">
          <p>No encontramos ese ejercicio.</p>
          <Link to="/">Volver a tus ejercicios</Link>
        </div>
      ) : null}

      {exercise ? (
        <Detail
          exercise={exercise}
          percentages={percentages}
          selected={selected}
          onSelect={onSelect}
        />
      ) : null}
    </>
  );
}

interface DetailProps {
  exercise: ManagedExerciseSummary;
  percentages: number[];
  selected: number | undefined;
  onSelect: (percentage: number) => void;
}

function Detail({ exercise, percentages, selected, onSelect }: DetailProps): React.JSX.Element {
  const rows = percentageTable(exercise.kind, exercise.current.value, percentages) ?? [];
  const current = selected ?? rows[0]?.percentage;

  return (
    <>
      <h1 className="page__title">{exercise.name}</h1>

      <div className="detail__current">
        <div>
          <p className="detail__current-label">
            {VALUE_LABEL[exercise.kind]} del {formatDate(exercise.current.performedAt)}
          </p>
          <p className="detail__current-value">{formatMark(exercise.current)}</p>
        </div>
        <Tag>{CATEGORY_LABEL[exercise.category]}</Tag>
      </div>

      <div className="detail__tags">
        <Tag variant="neutral">{LEVEL_LABEL[exercise.level]}</Tag>
        {exercise.withPain ? <Tag variant="danger">Con dolor</Tag> : null}
      </div>

      {supportsPercentages(exercise.kind) ? (
        <Percentages
          kind={exercise.kind}
          rows={rows}
          currentValue={exercise.current.value}
          selected={current}
          onSelect={onSelect}
        />
      ) : (
        <p className="detail__no-table">
          Los ejercicios de tiempo no tienen tabla de porcentajes: menos es mejor, así que se miran
          la mejor marca y el historial.
        </p>
      )}
    </>
  );
}

interface PercentagesProps {
  kind: MeasureKind;
  rows: PercentageRow[];
  currentValue: number;
  selected: number | undefined;
  onSelect: (percentage: number) => void;
}

function Percentages({
  kind,
  rows,
  currentValue,
  selected,
  onSelect,
}: PercentagesProps): React.JSX.Element {
  const [custom, setCustom] = useState('');
  const customError = custom.trim() === '' ? null : parsePercentage(custom).error;

  // La carga se calcula acá mismo: cambiar de porcentaje no le pregunta nada a la API.
  const shown = selected ?? rows[0]?.percentage ?? 0;
  const target = percentageTable(kind, currentValue, [shown])?.[0];

  return (
    <>
      <p className="detail__target" data-testid="carga">
        {target ? targetText(kind, target.target) : '—'}
      </p>

      <div
        className="detail__bar"
        role="progressbar"
        aria-label="Porcentaje elegido"
        aria-valuenow={shown}
        aria-valuemin={1}
        aria-valuemax={100}
      >
        <span className="detail__bar-fill" style={{ width: `${String(shown)}%` }} />
      </div>

      <p className="detail__band">
        <Tag>{BAND_LABEL[loadBandFor(shown)]}</Tag>
      </p>

      <fieldset className="detail__grid">
        <legend className="detail__grid-legend">Porcentajes</legend>
        {rows.map((row) => (
          <label
            key={row.percentage}
            className={`detail__option${row.percentage === shown ? ' detail__option--selected' : ''}`}
          >
            <input
              type="radio"
              className="detail__option-input"
              name="percentage"
              // Sin esto se lee "65%65 kg", pegado: los dos textos son cajas vecinas.
              aria-label={`${String(row.percentage)}% · ${targetText(kind, row.target)}`}
              checked={row.percentage === shown}
              onChange={() => {
                setCustom('');
                onSelect(row.percentage);
              }}
            />
            <span className="detail__option-percentage">{row.percentage}%</span>
            <span className="detail__option-target">{targetText(kind, row.target)}</span>
          </label>
        ))}
      </fieldset>

      <TextField
        label="Porcentaje custom"
        inputMode="numeric"
        suffix="%"
        placeholder="Ej: 98"
        value={custom}
        error={customError ?? undefined}
        onChange={(event) => {
          const { value } = event.target;
          setCustom(value);

          const parsed = parsePercentage(value);
          if (parsed.percentage !== null) {
            onSelect(parsed.percentage);
          }
        }}
      />
    </>
  );
}
