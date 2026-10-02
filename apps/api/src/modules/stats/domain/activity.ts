import {
  STALE_AFTER_DAYS,
  TOP_IMPROVEMENTS,
  periodStartFor,
  referenceValue,
  seriesValueFor,
  summarize,
  type MeasureKind,
  type MonthlyRecords,
  type StatsPeriod,
  type TrainingActivity,
} from '@wasabi-cross/schemas';
import type { RawSeriesPoint } from './stats-ports.ts';

/*
 * Constancia, récords y para retestear (F7-02, spec §5.4). Todo sale de las marcas: cuántas
 * hubo, cuándo, cuáles superaron a las anteriores y qué ejercicio hace mucho que no se mide.
 * El reloj se inyecta: "hace 60 días" depende de cuándo se pregunta.
 */

/** Un ejercicio con **todas** sus marcas: una mejor marca nueva se compara con las de antes. */
export interface ActivityExercise {
  readonly managedExerciseId: string;
  readonly name: string;
  readonly kind: MeasureKind;
  readonly points: readonly RawSeriesPoint[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** El mes de una fecha, en UTC: la marca se guarda al mediodía del usuario (spec §5.4). */
function monthOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

/** Por fecha; las del mismo instante, en el orden en que llegaron (el de carga). */
function byDate(points: readonly RawSeriesPoint[]): RawSeriesPoint[] {
  return [...points].sort((a, b) => Date.parse(a.performedAt) - Date.parse(b.performedAt));
}

/** Del mes de `start` al de `end`, los dos incluidos, con las marcas de cada uno. */
function months(start: Date, end: Date, dates: readonly Date[]): MonthlyRecords[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    counts.set(monthOf(date), (counts.get(monthOf(date)) ?? 0) + 1);
  }

  const result: MonthlyRecords[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = monthOf(end);
  while (monthOf(cursor) <= last) {
    result.push({ month: monthOf(cursor), records: counts.get(monthOf(cursor)) ?? 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

/**
 * Cuántas marcas del período superaron a todas las anteriores de su ejercicio, con la vara de
 * la mejor marca (spec §5.1): en tiempo, menos; en hipertrofia, el RM estimado. La primera
 * marca no superó a nada y el empate no es superar.
 */
function personalBests(exercise: ActivityExercise, inPeriod: (date: Date) => boolean): number {
  const lessIsBetter = exercise.kind === 'time';
  let best: number | null = null;
  let count = 0;

  for (const point of byDate(exercise.points)) {
    const value = referenceValue(exercise.kind, point);
    const beats = best !== null && (lessIsBetter ? value < best : value > best);
    if (beats && inPeriod(new Date(point.performedAt))) {
      count += 1;
    }
    if (best === null || beats) {
      best = value;
    }
  }

  return count;
}

export function trainingActivity(
  exercises: readonly ActivityExercise[],
  period: StatsPeriod,
  now: Date,
): TrainingActivity {
  const from = periodStartFor(period, now);
  const inPeriod = (date: Date): boolean => from === null || date >= from;
  const allDates = exercises.flatMap((exercise) =>
    exercise.points.map((point) => new Date(point.performedAt)),
  );
  const periodDates = allDates.filter(inPeriod);

  const last =
    allDates.length === 0 ? null : new Date(Math.max(...allDates.map((date) => date.getTime())));
  // En "todo el historial" el período arranca con la primera marca.
  const first =
    allDates.length === 0 ? null : new Date(Math.min(...allDates.map((date) => date.getTime())));
  const start = from ?? first;

  const topImprovements = exercises
    .flatMap((exercise) => {
      const series = byDate(exercise.points)
        .filter((point) => inPeriod(new Date(point.performedAt)))
        .map((point) => ({
          performedAt: point.performedAt,
          value: seriesValueFor(exercise.kind, point),
        }));
      const summary = summarize(exercise.kind, series);
      // Con una sola marca la variación es 0: no hay mejora que mostrar.
      return summary !== null && summary.changePercent > 0
        ? [
            {
              id: exercise.managedExerciseId,
              name: exercise.name,
              changePercent: summary.changePercent,
            },
          ]
        : [];
    })
    .sort((a, b) => b.changePercent - a.changePercent || a.name.localeCompare(b.name, 'es'))
    .slice(0, TOP_IMPROVEMENTS);

  const stale = exercises
    .flatMap((exercise) => {
      const latest = byDate(exercise.points).at(-1);
      if (latest === undefined) {
        return [];
      }
      const days = daysBetween(new Date(latest.performedAt), now);
      return days > STALE_AFTER_DAYS
        ? [
            {
              id: exercise.managedExerciseId,
              name: exercise.name,
              lastRecordAt: latest.performedAt,
              days,
            },
          ]
        : [];
    })
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name, 'es'));

  return {
    period,
    records: periodDates.length,
    byMonth: start === null ? [] : months(start, now, periodDates),
    lastRecordAt: last === null ? null : last.toISOString(),
    daysSinceLast: last === null ? null : daysBetween(last, now),
    personalBests: exercises.reduce(
      (total, exercise) => total + personalBests(exercise, inPeriod),
      0,
    ),
    topImprovements,
    stale,
  };
}
