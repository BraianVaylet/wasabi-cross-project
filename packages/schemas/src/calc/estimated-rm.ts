import type { MeasureKind } from '../exercise/exercise.schema.ts';
import { UNIT_BY_KIND } from '../record/record.schema.ts';

/*
 * El RM estimado de hipertrofia (spec §5.1). En hipertrofia se registran repeticiones con su
 * peso, y 10 × 80 kg no se compara con 6 × 90 kg si no es a través de una misma vara: el RM
 * que esas repeticiones dejan estimar. Se calcula, no se guarda.
 *
 * Vive en el paquete compartido para que el front y el back calculen exactamente igual
 * (ADR-0006): la API lo usa para la mejor marca y las estadísticas, y el detalle para la
 * tabla de porcentajes.
 */

/** Al 0,5 kg más cercano; en el empate exacto, hacia arriba. Lo que se muestra, no lo que se calcula. */
export function roundToHalfKg(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * RM estimado con la fórmula de Epley: `peso × (1 + repeticiones / 30)`. Con una sola
 * repetición el RM es el peso: la fórmula ya no estima nada, es una marca de RM.
 *
 * Devuelve el número sin redondear (`estimatedOneRm(80, 10)` → 106,67): la carga de la tabla de
 * porcentajes sale de acá, y sólo se redondea lo que se muestra. Epley se aleja del RM real por
 * encima de unas 10 repeticiones (ADR-0009).
 */
export function estimatedOneRm(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError(
      `El peso tiene que ser un número mayor a cero (llegó ${String(weightKg)})`,
    );
  }
  if (!Number.isInteger(reps) || reps <= 0) {
    throw new RangeError(
      `Las repeticiones tienen que ser un entero mayor a cero (llegó ${String(reps)})`,
    );
  }

  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** Lo mínimo de una marca que hace falta para su valor de referencia. */
export interface ReferenceMark {
  readonly value: number;
  readonly weightKg?: number | undefined;
}

/**
 * El número sobre el que se calculan los porcentajes de una marca: el RM estimado en
 * hipertrofia (sin redondear), y el valor tal cual en las demás categorías.
 *
 * Una marca de hipertrofia sin peso no existe (la API lo exige); si llegara una de antes de esa
 * regla, se usa el valor tal cual en vez de romper la pantalla.
 */
export function referenceValue(kind: MeasureKind, mark: ReferenceMark): number {
  return kind === 'weighted_reps' && mark.weightKg !== undefined
    ? estimatedOneRm(mark.weightKg, mark.value)
    : mark.value;
}

/**
 * El valor de una marca en la serie que se grafica y se resume: en hipertrofia, su RM estimado
 * (al 0,5 kg, porque es lo que se ve en el gráfico); en el resto, el valor de la marca.
 */
export function seriesValueFor(kind: MeasureKind, mark: ReferenceMark): number {
  return kind === 'weighted_reps' && mark.weightKg !== undefined
    ? roundToHalfKg(referenceValue(kind, mark))
    : mark.value;
}

/** La unidad de la serie de un ejercicio: en hipertrofia son kg (RM estimado), no repeticiones. */
export function seriesUnitFor(kind: MeasureKind): 'kg' | 'reps' | 's' | 'm' {
  return kind === 'weighted_reps' ? 'kg' : UNIT_BY_KIND[kind];
}
