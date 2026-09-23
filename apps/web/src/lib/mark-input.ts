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
  weighted_reps: { label: 'Repeticiones', placeholder: 'Ej: 12' },
  time: { label: 'Tiempo (mm:ss)', placeholder: 'Ej: 04:32' },
};

/** El peso de una marca de hipertrofia, junto a las repeticiones (spec §5.1). */
export const WEIGHT_FIELD: MarkField = { label: 'Peso (kg)', placeholder: 'Ej: 80' };

/** El desnivel de una marca de running, junto al tiempo. Plano es 0, no vacío. */
export const ELEVATION_FIELD: MarkField = { label: 'Desnivel (m)', placeholder: 'Ej: 150' };

/** El motivo cuando lo que se escribió no es un valor válido para esa medición. */
export function markValueError(kind: MeasureKind): string {
  return kind === 'time' ? 'Escribilo como mm:ss, por ejemplo 4:32' : 'Cargá un número, como 100';
}

/** El motivo cuando el peso de hipertrofia no es un número. */
export const weightError = 'Cargá el peso, como 80';

/** El motivo cuando el desnivel de running no es un número. Plano es 0, no vacío. */
export const elevationError = 'Cargá el desnivel, como 150 (0 si es plano)';

/** El valor tal como viaja a la API: segundos en tiempo, el número en el resto. */
export function parseMarkValue(kind: MeasureKind | null, value: string): number | null {
  if (kind === 'time') {
    return parseDuration(value);
  }

  const parsed = Number(value.trim().replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
}

/** El peso de hipertrofia o el desnivel de running: un número simple, sin reglas de kind. */
export function parsePlainNumber(value: string): number | null {
  return parseMarkValue(null, value);
}

export type ExtraFieldKind = 'weightKg' | 'elevationGainM';

/**
 * Qué campo extra pide una marca, además de su valor principal: el peso en hipertrofia,
 * el desnivel en running. El resto no tiene segundo campo (spec §5.1).
 */
export function extraFieldKindFor(kind: MeasureKind | null): ExtraFieldKind | null {
  if (kind === 'weighted_reps') {
    return 'weightKg';
  }
  if (kind === 'time') {
    return 'elevationGainM';
  }
  return null;
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
