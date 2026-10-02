import { extraFieldFor, type ExtraField, type MeasureKind } from '@wasabi-cross/schemas';
import { parseDuration } from './format.ts';

/*
 * Cómo se escribe una marca según lo que mide el ejercicio. Lo usan el alta (F1-12) y el
 * modal de marca nueva (F1-14): la misma regla en los dos lados.
 */

export interface MarkField {
  label: string;
  placeholder: string;
  /** Qué se espera que se escriba, donde no es obvio: en lo que no es RM, la mejor marca. */
  hint?: string;
}

/*
 * Fuera de fuerza no hay RM: lo que se anota es la mejor marca de esa disciplina, el equivalente
 * de un RM (spec §5.1). Se aclara en el campo para que no se cargue la última marca cualquiera.
 */
export const MARK_FIELD: Record<MeasureKind, MarkField> = {
  rm: { label: 'RM (kg)', placeholder: 'Ej: 100' },
  reps: {
    label: 'Repeticiones',
    placeholder: 'Ej: 30',
    hint: '🚀 Máximas repeticiones.',
  },
  weighted_reps: {
    label: 'Repeticiones',
    placeholder: 'Ej: 12',
    hint: '🚀 Máximas repeticiones que lograste con ese peso.',
  },
  time: {
    label: 'Tiempo (mm:ss)',
    placeholder: 'Ej: 04:32',
    hint: '🚀 Tu mejor tiempo.',
  },
  distance: {
    label: 'Distancia (m)',
    placeholder: 'Ej: 2000',
    hint: '🚀 Distancia máxima.',
  },
  weighted_distance: {
    label: 'Distancia (m)',
    placeholder: 'Ej: 50',
    hint: '🚀 Distancia máxima con ese peso.',
  },
};

/**
 * El campo del dato extra de una marca, con el motivo si lo que se escribió no es un número.
 * Qué dato lleva cada medición lo dice `extraFieldFor` de schemas (spec §5.1): acá sólo
 * cómo se pide en pantalla.
 */
export const EXTRA_FIELD: Record<ExtraField, MarkField & { error: string }> = {
  weightKg: { label: 'Peso (kg)', placeholder: 'Ej: 80', error: 'Cargá el peso, como 80' },
  // Plano es 0, no vacío.
  elevationGainM: {
    label: 'Desnivel (m)',
    placeholder: 'Ej: 150',
    error: 'Cargá el desnivel, como 150 (0 si es plano)',
  },
  caloriesKcal: {
    label: 'Calorías (kcal)',
    placeholder: 'Ej: 120',
    error: 'Cargá las calorías, como 120',
  },
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

/** El dato extra (peso, desnivel, calorías): un número simple, sin reglas de kind. */
export function parsePlainNumber(value: string): number | null {
  return parseMarkValue(null, value);
}

/** Qué dato extra pide una marca, además de su valor principal, si pide alguno. */
export function extraFieldKindFor(kind: MeasureKind | null): ExtraField | null {
  return kind === null ? null : extraFieldFor(kind);
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
