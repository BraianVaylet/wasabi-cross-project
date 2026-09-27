import {
  loadBandFor,
  percentageTable,
  supportsPercentages,
  type LoadBand,
  type ManagedExerciseSummary,
  type MeasureKind,
  type PercentageRow,
  type RecordInput,
} from '@wasabi-cross/schemas';
import { Link } from '@tanstack/react-router';
import {
  Button,
  Measure,
  PencilIcon,
  PercentTiles,
  SectionHeader,
  Skeleton,
  Tag,
  TextField,
  type TagVariant,
} from '@wasabi-cross/ui';
import { useId, useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMark, markParts } from '../../lib/format.ts';
import { History, type HistoryProps } from './History.tsx';
import { NewMark, newMarkLabel } from './NewMark.tsx';
import { parsePercentage } from './percentage.ts';
import './exercise-detail.css';

/** Cargar una marca nueva (F1-14). Lo que falla lo cuenta la pantalla, no el modal. */
export interface MarkFormProps {
  saving: boolean;
  error: unknown;
  onSave: (input: RecordInput) => void;
}

export interface ExerciseDetailPageProps {
  exercise: ManagedExerciseSummary | undefined;
  /** Los porcentajes del perfil del usuario (F1-16). */
  percentages: number[];
  loading: boolean;
  error: unknown;
  /** El porcentaje elegido vive en la URL, así un link lleva a la misma carga. */
  selected: number | undefined;
  onSelect: (percentage: number) => void;
  /** El historial de marcas (F1-13b), que se pide aparte de la lista. */
  history: Omit<HistoryProps, 'showBest'>;
  mark: MarkFormProps;
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

/** Verde para liviana, ámbar para media, rojo para pesada — semáforo de carga (spec §5.1). */
const BAND_VARIANT: Record<LoadBand, TagVariant> = {
  liviana: 'success',
  media: 'warning',
  pesada: 'danger',
};

/** Lo que dice la grilla según lo que mide el ejercicio (spec §5.2: repeticiones, no RM). */
const LOAD_COPY = {
  rm: { title: 'Elegí tu carga', legend: 'Porcentaje del RM' },
  reps: { title: 'Elegí tus reps', legend: 'Porcentaje del máximo' },
} as const;

function targetText(kind: MeasureKind, target: number): string {
  return formatMark({ value: target, unit: kind === 'rm' ? 'kg' : 'reps' });
}

/** Detalle de un ejercicio: el diseño de `docs/design`, zona por zona (spec §5.2). */
export function ExerciseDetailPage({
  exercise,
  percentages,
  loading,
  error,
  selected,
  onSelect,
  history,
  mark,
}: ExerciseDetailPageProps): React.JSX.Element {
  return (
    <>
      {loading ? <Skeleton label="Cargando el ejercicio" count={3} /> : null}
      {error ? <ErrorNotice error={error} /> : null}

      {!loading && !error && !exercise ? (
        <div className="detail__missing">
          <p>No encontramos ese ejercicio.</p>
          <Link to="/">Volver a tus ejercicios</Link>
        </div>
      ) : null}

      {/*
       * No antes de que `loading` se apague: `percentages` puede llegar vacío mientras las
       * preferencias todavía están en camino, y la tabla no sabe mostrar "todavía no sé".
       */}
      {!loading && exercise ? (
        <Detail
          exercise={exercise}
          percentages={percentages}
          selected={selected}
          onSelect={onSelect}
          history={history}
          mark={mark}
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
  history: Omit<HistoryProps, 'showBest'>;
  mark: MarkFormProps;
}

function Detail({
  exercise,
  percentages,
  selected,
  onSelect,
  history,
  mark,
}: DetailProps): React.JSX.Element {
  const rows = percentageTable(exercise.kind, exercise.current.value, percentages) ?? [];
  const current = selected ?? rows[0]?.percentage;
  const [marking, setMarking] = useState(false);

  return (
    <>
      <Header exercise={exercise} />

      <Button
        block
        disabled={mark.saving}
        onClick={() => {
          setMarking(true);
        }}
      >
        {newMarkLabel(exercise.kind)}
      </Button>

      <Link to="/estadisticas" search={{ abierto: exercise.id }} className="detail__stats">
        Estadísticas
      </Link>

      {mark.error ? <ErrorNotice error={mark.error} /> : null}

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

      <History {...history} showBest={!supportsPercentages(exercise.kind)} />

      <NewMark
        kind={exercise.kind}
        open={marking}
        onClose={() => {
          setMarking(false);
        }}
        onSave={mark.onSave}
      />
    </>
  );
}

/**
 * Zona 2 de spec §5.2: de dónde viene, el nombre con su lápiz, el nivel y el valor actual. Las
 * tags de categoría, nivel y dolor (§5.1) se leen en estas líneas, no como pastillas.
 */
function Header({ exercise }: { exercise: ManagedExerciseSummary }): React.JSX.Element {
  const titleId = useId();
  const isRm = exercise.kind === 'rm';
  const value = markParts(exercise.current);

  return (
    <section className="detail__head" aria-labelledby={titleId}>
      {/* "‹ EJERCICIOS" y no el "MOVIMIENTO" del diseño: instalada en iOS, no hay botón atrás. */}
      <p className="wc-kicker detail__crumbs">
        <Link to="/" className="detail__back">
          <span aria-hidden="true">‹ </span>Ejercicios
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{CATEGORY_LABEL[exercise.category]}</span>
      </p>

      <div className="detail__title-row">
        <h1 id={titleId} className="detail__title">
          {exercise.name}
        </h1>
        <Link
          to="/ejercicios/$id/editar"
          params={{ id: exercise.id }}
          className="wc-icon-button"
          aria-label="Editar"
        >
          <span aria-hidden="true" className="wc-icon-button__icon">
            <PencilIcon />
          </span>
        </Link>
      </div>

      <p className="detail__sub">
        <span>{LEVEL_LABEL[exercise.level]}</span>
        <span className="detail__slash" aria-hidden="true">
          {' // '}
        </span>
        <span>{isRm ? 'RM vigente' : 'Marca vigente'}</span>
        {exercise.withPain ? (
          <>
            <span className="detail__slash" aria-hidden="true">
              {' // '}
            </span>
            <span className="detail__pain">Con dolor</span>
          </>
        ) : null}
      </p>

      <div className="detail__current">
        <div className="detail__current-info">
          <p className="wc-kicker">{isRm ? 'RM actual' : 'Marca actual'}</p>
          <p className="detail__registered">
            Registrado el {formatDate(exercise.current.performedAt)}
          </p>
          {value.extra ? <p className="detail__registered">{value.extra}</p> : null}
        </div>
        <Measure
          value={value.value}
          unit={value.unit}
          size="lg"
          className="detail__current-value"
          data-testid="valor-actual"
        />
      </div>
    </section>
  );
}

interface PercentagesProps {
  kind: MeasureKind;
  rows: PercentageRow[];
  currentValue: number;
  selected: number | undefined;
  onSelect: (percentage: number) => void;
}

/** Zona 3 de spec §5.2: la grilla de porcentajes y el porcentaje personalizado. */
function Percentages({
  kind,
  rows,
  currentValue,
  selected,
  onSelect,
}: PercentagesProps): React.JSX.Element {
  const titleId = useId();
  const [custom, setCustom] = useState('');
  const customError = custom.trim() === '' ? null : parsePercentage(custom).error;
  const copy = kind === 'rm' ? LOAD_COPY.rm : LOAD_COPY.reps;

  // La carga se calcula acá mismo: cambiar de porcentaje no le pregunta nada a la API.
  const shown = selected ?? rows[0]?.percentage ?? 0;
  const target = percentageTable(kind, currentValue, [shown])?.[0];
  const band = loadBandFor(shown);

  return (
    <section className="detail__load" aria-labelledby={titleId}>
      <p className="detail__target" data-testid="carga">
        {target ? targetText(kind, target.target) : '—'}
      </p>
      <p className="detail__band">
        <Tag variant={BAND_VARIANT[band]}>{BAND_LABEL[band]}</Tag>
      </p>

      <SectionHeader id={titleId} title={copy.title} meta={copy.legend} />

      <PercentTiles
        legend={copy.legend}
        name="percentage"
        options={rows.map((row) => ({
          value: row.percentage,
          label: `${String(row.percentage)}%`,
          detail: targetText(kind, row.target),
        }))}
        value={shown}
        onChange={(percentage) => {
          setCustom('');
          onSelect(percentage);
        }}
      />

      <TextField
        label="Porcentaje personalizado"
        variant="inline"
        inputMode="numeric"
        suffix="%"
        placeholder="—"
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
    </section>
  );
}
