import {
  improvement,
  loadBandFor,
  percentageTable,
  supportsPercentages,
  type ExerciseCategory,
  type ExerciseStats,
  type LoadBand,
  type ManagedExerciseSummary,
  type Mark,
  type MeasureKind,
  type PercentageRow,
  type RecordInput,
} from '@wasabi-cross/schemas';
import { Link } from '@tanstack/react-router';
import {
  BottomBar,
  Button,
  Chart,
  Measure,
  PencilIcon,
  PercentTiles,
  SectionHeader,
  Skeleton,
  Tag,
  TextField,
  type TagVariant,
} from '@wasabi-cross/ui';
import { useCallback, useId, useState } from 'react';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { formatDate, formatMark, markParts } from '../../lib/format.ts';
import { History, type HistoryProps } from './History.tsx';
import { NewMark, newMarkAction } from './NewMark.tsx';
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
  /**
   * El historial de marcas (F1-13b), que se pide aparte de la lista, con la mejor marca: la
   * barra fija la muestra en tiempo, donde no hay carga que calcular (spec §5.2).
   */
  history: DetailHistory;
  /** La evolución de todo el historial, para el progreso (spec §5.2, zona 4). */
  progress: ProgressProps;
  mark: MarkFormProps;
}

export interface ProgressProps {
  stats: ExerciseStats | undefined;
  loading: boolean;
  error: unknown;
}

export type DetailHistory = HistoryProps & { best: Mark | undefined };

const CATEGORY_LABEL = {
  fuerza: 'Fuerza',
  hipertrofia: 'Hipertrofia',
  gimnastico: 'Gimnástico',
  running: 'Running',
  cardio: 'Cardio',
  distancia_carga: 'Distancia con carga',
} as const satisfies Record<ExerciseCategory, string>;

/** Por qué no hay tabla de porcentajes (spec §5.1): depende de hacia dónde se mejora. */
function noTableCopy(kind: MeasureKind): string {
  return kind === 'time'
    ? 'Los ejercicios de tiempo no tienen tabla de porcentajes: menos es mejor, así que se miran la mejor marca y el historial.'
    : 'Los ejercicios de distancia no tienen tabla de porcentajes: se miran la mejor marca y el historial.';
}

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
  progress,
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
          progress={progress}
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
  history: DetailHistory;
  progress: ProgressProps;
  mark: MarkFormProps;
}

function Detail({
  exercise,
  percentages,
  selected,
  onSelect,
  history,
  progress,
  mark,
}: DetailProps): React.JSX.Element {
  const rows = percentageTable(exercise.kind, exercise.current.value, percentages) ?? [];
  const withPercentages = supportsPercentages(exercise.kind);
  // El porcentaje de la URL, o el primero de la grilla. La carga se calcula acá mismo:
  // cambiar de porcentaje no le pregunta nada a la API.
  const shown = selected ?? rows[0]?.percentage ?? 0;
  const [marking, setMarking] = useState(false);
  const { best, ...list } = history;

  return (
    <>
      <Header exercise={exercise} />

      {mark.error ? <ErrorNotice error={mark.error} /> : null}

      {withPercentages ? (
        <Percentages kind={exercise.kind} rows={rows} selected={shown} onSelect={onSelect} />
      ) : (
        <p className="detail__no-table">{noTableCopy(exercise.kind)}</p>
      )}

      <Progress exercise={exercise} {...progress} />

      <History {...list} kind={exercise.kind} count={progress.stats?.summary?.records} />

      {/* Zona 6: la barra fija. Al final del contenido, así reserva su lugar abajo de todo. */}
      <BottomBar label={withPercentages ? 'Carga seleccionada' : 'Mejor marca'}>
        {withPercentages ? <Load exercise={exercise} percentage={shown} /> : <Best best={best} />}
        <Button
          variant="cta"
          className="detail__cta"
          disabled={mark.saving}
          onClick={() => {
            setMarking(true);
          }}
        >
          {newMarkAction(exercise.kind)}
        </Button>
      </BottomBar>

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

/**
 * La carga calculada de la barra fija: "65% DE 100 KG", la carga en grande y su banda
 * (spec §5.1: el tag va acá, no hay barra de progreso).
 */
function Load({
  exercise,
  percentage,
}: {
  exercise: ManagedExerciseSummary;
  percentage: number;
}): React.JSX.Element {
  const target = percentageTable(exercise.kind, exercise.current.value, [percentage])?.[0];
  const parts = target
    ? markParts({ value: target.target, unit: exercise.kind === 'rm' ? 'kg' : 'reps' })
    : { value: '—' };
  const band = loadBandFor(percentage);

  return (
    <div className="detail__bar-info">
      <p className="wc-kicker detail__bar-caption">
        {percentage}% de {formatMark(exercise.current)}
      </p>
      <Measure
        value={parts.value}
        unit={parts.unit}
        size="hero"
        tone="accent"
        data-testid="carga"
      />
      <p className="detail__bar-foot">
        <span className="wc-kicker">
          {exercise.kind === 'rm' ? 'Carga calculada' : 'Reps calculadas'}
        </span>
        <Tag variant={BAND_VARIANT[band]}>{BAND_LABEL[band]}</Tag>
      </p>
    </div>
  );
}

/** En tiempo no hay carga: la barra muestra la mejor marca (spec §5.2). */
function Best({ best }: { best: Mark | undefined }): React.JSX.Element {
  const parts = best ? markParts(best) : { value: '—' };

  return (
    <div className="detail__bar-info" data-testid="mejor-marca">
      <p className="wc-kicker detail__bar-caption">Mejor marca</p>
      <Measure value={parts.value} unit={parts.unit} size="hero" tone="accent" />
      {best ? (
        <p className="detail__bar-foot">
          <span className="wc-kicker">Del {formatDate(best.performedAt)}</span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Zona 4 de spec §5.2: el gráfico de todo el historial y cuánto mejoró desde la primera
 * marca. La cuenta del aumento vive en `@wasabi-cross/schemas`, como el resto de las reglas.
 */
function Progress({
  exercise,
  stats,
  loading,
  error,
}: ProgressProps & { exercise: ManagedExerciseSummary }): React.JSX.Element {
  const titleId = useId();
  const isRm = exercise.kind === 'rm';
  const unit = stats?.unit ?? exercise.current.unit;
  // Estable: si cambia en cada render, el gráfico se arma de nuevo cada vez.
  const formatValue = useCallback((value: number) => formatMark({ value, unit }), [unit]);
  const gain = stats ? improvement(exercise.kind, stats.series) : null;

  return (
    <section className="detail__progress" aria-labelledby={titleId}>
      <SectionHeader
        id={titleId}
        title={isRm ? 'Progreso del RM' : 'Progreso'}
        kicker={`Tendencia de ${CATEGORY_LABEL[exercise.category]}`}
        divider={false}
        meta={gain === null ? undefined : <Gain kind={exercise.kind} unit={unit} gain={gain} />}
      />

      {loading ? <Skeleton label="Cargando el progreso" /> : null}
      {error ? <ErrorNotice error={error} /> : null}
      {stats ? (
        <Chart
          label={isRm ? 'RM registrado' : 'Marcas registradas'}
          // Un tiempo se escribe 4:32: "UNIDAD: S" diría otra cosa que lo que se ve.
          unit={unit === 's' ? 'mm:ss' : unit}
          points={stats.series.map((point) => ({
            label: formatDate(point.performedAt),
            value: point.value,
          }))}
          formatValue={formatValue}
        />
      ) : null}

      <Link to="/estadisticas" search={{ abierto: exercise.id }} className="detail__more">
        Ver estadísticas<span aria-hidden="true"> ›</span>
      </Link>
    </section>
  );
}

/** "AUMENTO +40 KG"; en tiempo, "MEJORA +8 S": bajar es mejorar (spec §5.2). */
function Gain({
  kind,
  unit,
  gain,
}: {
  kind: MeasureKind;
  unit: ExerciseStats['unit'];
  gain: number;
}): React.JSX.Element {
  const parts = markParts({ value: Math.abs(gain), unit });
  const sign = gain > 0 ? '+' : gain < 0 ? '−' : '';

  return (
    <span className="detail__gain" data-testid="aumento">
      <span className="detail__gain-label">{kind === 'time' ? 'Mejora' : 'Aumento'}</span>
      <Measure
        value={`${sign}${parts.value}`}
        unit={parts.unit}
        size="sm"
        tone={gain > 0 ? 'accent' : 'default'}
      />
    </span>
  );
}

interface PercentagesProps {
  kind: MeasureKind;
  rows: PercentageRow[];
  selected: number;
  onSelect: (percentage: number) => void;
}

/** Zona 3 de spec §5.2: la grilla de porcentajes y el porcentaje personalizado. */
function Percentages({ kind, rows, selected, onSelect }: PercentagesProps): React.JSX.Element {
  const titleId = useId();
  const [custom, setCustom] = useState('');
  const customError = custom.trim() === '' ? null : parsePercentage(custom).error;
  const copy = kind === 'rm' ? LOAD_COPY.rm : LOAD_COPY.reps;

  return (
    <section className="detail__load" aria-labelledby={titleId}>
      <SectionHeader id={titleId} title={copy.title} meta={copy.legend} />

      <PercentTiles
        legend={copy.legend}
        name="percentage"
        options={rows.map((row) => ({
          value: row.percentage,
          label: `${String(row.percentage)}%`,
          detail: targetText(kind, row.target),
        }))}
        value={selected}
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
