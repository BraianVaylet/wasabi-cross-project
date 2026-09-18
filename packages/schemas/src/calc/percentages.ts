import type { MeasureKind } from '../exercise/exercise.schema.ts';

/*
 * Cálculo de porcentajes (spec §5.1). Vive en el paquete compartido para que el front y
 * el back calculen exactamente igual: el front lo necesita para el porcentaje custom
 * mientras se tipea, sin ir a la API (ADR-0006).
 *
 * Los porcentajes llegan como enteros de 1 a 100, igual que en las preferencias del
 * usuario: 65 significa 65%, no 0,65.
 */

export type LoadBand = 'liviana' | 'media' | 'pesada';

export interface PercentageRow {
  readonly percentage: number;
  /** Kilos en fuerza, repeticiones en hipertrofia y gimnástico. */
  readonly target: number;
  readonly band: LoadBand;
}

function assertPercentage(percentage: number): void {
  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
    throw new RangeError(
      `El porcentaje tiene que estar entre 1 y 100 (llegó ${String(percentage)})`,
    );
  }
}

/**
 * Banda de carga según el porcentaje: menos de 70% liviana, de 70% a 84% media, desde 85%
 * pesada. Se calcula siempre; no se guarda.
 */
export function loadBandFor(percentage: number): LoadBand {
  assertPercentage(percentage);

  if (percentage < 70) return 'liviana';
  if (percentage < 85) return 'media';
  return 'pesada';
}

/**
 * Carga para un porcentaje del RM, redondeada al 0,5 kg más cercano. En el empate exacto
 * (x,25 o x,75) redondea hacia arriba, que es lo que hace `Math.round`.
 */
export function loadFor(rmKg: number, percentage: number): number {
  assertPercentage(percentage);
  if (!Number.isFinite(rmKg) || rmKg <= 0) {
    throw new RangeError(`El RM tiene que ser un número mayor a cero (llegó ${String(rmKg)})`);
  }

  return Math.round(((rmKg * percentage) / 100) * 2) / 2;
}

/**
 * Repeticiones para un porcentaje del máximo, redondeadas hacia abajo y con mínimo 1:
 * nunca por encima de la intensidad pedida, pero tampoco una serie de cero.
 */
export function repsFor(maxReps: number, percentage: number): number {
  assertPercentage(percentage);
  if (!Number.isInteger(maxReps) || maxReps <= 0) {
    throw new RangeError(
      `Las repeticiones tienen que ser un entero mayor a cero (llegó ${String(maxReps)})`,
    );
  }

  return Math.max(1, Math.floor((maxReps * percentage) / 100));
}

/** Los ejercicios de tiempo no tienen tabla de porcentajes (decisión del 2026-09-18). */
export function supportsPercentages(kind: MeasureKind): boolean {
  return kind !== 'time';
}

/**
 * La tabla de porcentajes del detalle de un ejercicio, en el orden que eligió el usuario.
 * `null` en tiempo, donde se muestran la mejor marca y el historial en su lugar.
 */
export function percentageTable(
  kind: MeasureKind,
  current: number,
  percentages: readonly number[],
): PercentageRow[] | null {
  if (!supportsPercentages(kind)) {
    return null;
  }

  const targetFor = kind === 'rm' ? loadFor : repsFor;

  return percentages.map((percentage) => ({
    percentage,
    target: targetFor(current, percentage),
    band: loadBandFor(percentage),
  }));
}
