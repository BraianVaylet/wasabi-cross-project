import type { MeasureKind } from '@wasabi-cross/schemas';
import { parseDuration } from './format.ts';

/*
 * Cómo se escribe una marca según lo que mide el ejercicio. Lo usan el alta (F1-12) y el
 * modal de marca nueva (F1-14): la misma regla en los dos lados.
 */

export interface MarkField {
  label: string;
  placeholder: string;
}

export const MARK_FIELD: Record<MeasureKind, MarkField> = {
  rm: { label: 'RM (kg)', placeholder: 'Ej: 100' },
  reps: { label: 'Repeticiones', placeholder: 'Ej: 30' },
  time: { label: 'Tiempo (mm:ss)', placeholder: 'Ej: 4:32' },
};

/** El motivo cuando lo que se escribió no es un valor válido para esa medición. */
export function markValueError(kind: MeasureKind): string {
  return kind === 'time' ? 'Escribilo como mm:ss, por ejemplo 4:32' : 'Cargá un número, como 100';
}

/** El valor tal como viaja a la API: segundos en tiempo, el número en el resto. */
export function parseMarkValue(kind: MeasureKind | null, value: string): number | null {
  if (kind === 'time') {
    return parseDuration(value);
  }

  const parsed = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
}

/**
 * La fecha elegida, al mediodía de la zona del usuario: a medianoche, un huso negativo la
 * correría al día anterior.
 */
export function performedAtFrom(date: string): string | undefined {
  return date === '' ? undefined : new Date(`${date}T12:00:00`).toISOString();
}

/** Hoy, en el formato del campo de fecha. Sirve de `max`: no hay marcas futuras (spec §5.1). */
export function today(): string {
  return new Date().toLocaleDateString('sv-SE');
}
