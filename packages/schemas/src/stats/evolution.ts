import type { MeasureKind } from '../exercise/exercise.schema.ts';
import type { SeriesPoint, StatsPeriod } from './stats.api.ts';

/*
 * Los números de la evolución (spec §5). Vive en el paquete compartido, como el cálculo de
 * porcentajes (ADR-0006): la API los calcula para responder y el front los vuelve a usar
 * para el período que el usuario cambia en pantalla, sin que las dos cuentas se separen.
 *
 * La regla que no se puede olvidar: en tiempo, menos es mejor. La mejor marca es la mínima
 * y bajar de 300 a 270 segundos es una mejora del 10%, no una caída.
 */

export type { SeriesPoint } from './stats.api.ts';

export interface EvolutionSummary {
  /** La marca más reciente del período. */
  readonly current: number;
  /** La mejor: la máxima, o la mínima en tiempo. */
  readonly best: number;
  readonly worst: number;
  /** Variación entre la primera y la última del período. Positiva es mejora. */
  readonly changePercent: number;
  /** Cuántas marcas sostienen este resumen. */
  readonly records: number;
}

/** Cuántos meses mira cada período. `todo` no mira hacia atrás: mira todo. */
const MONTHS: Record<StatsPeriod, number | null> = { '3m': 3, '6m': 6, '12m': 12, todo: null };

/**
 * Desde cuándo se cuentan las marcas de un período, o `null` si es `todo`. El `now` se
 * inyecta para que los tests no dependan del reloj de quien los corre.
 */
export function periodStartFor(period: StatsPeriod, now: Date = new Date()): Date | null {
  const months = MONTHS[period];
  if (months === null) {
    return null;
  }

  const start = new Date(now.getTime());
  start.setUTCMonth(start.getUTCMonth() - months);
  return start;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Resume una serie de marcas. Devuelve `null` si no hay ninguna: un resumen en cero diría
 * que el atleta levantó cero kilos, que es distinto de no haber cargado nada.
 *
 * No depende del orden en que lleguen los puntos: la primera y la última son por fecha.
 */
export function summarize(
  kind: MeasureKind,
  points: readonly SeriesPoint[],
): EvolutionSummary | null {
  if (points.length === 0) {
    return null;
  }

  const ordered = [...points].sort((a, b) => Date.parse(a.performedAt) - Date.parse(b.performedAt));
  const values = ordered.map((point) => point.value);
  const first = values[0];
  const current = values.at(-1);
  /* v8 ignore next 3 -- `points` no está vacío: lo dice el `return null` de arriba */
  if (first === undefined || current === undefined) {
    return null;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const lessIsBetter = kind === 'time';

  // Sobre la primera marca del período: es contra lo que el atleta se compara.
  const change = first === 0 ? 0 : ((current - first) / first) * 100;

  return {
    current,
    best: lessIsBetter ? min : max,
    worst: lessIsBetter ? max : min,
    changePercent: round1(lessIsBetter ? -change : change),
    records: ordered.length,
  };
}
