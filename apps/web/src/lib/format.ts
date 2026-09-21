/*
 * Formato es-AR (spec §11). El valor y su unidad llegan de la API; acá sólo se muestran.
 */

const DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const NUMBER = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

/** La fecha de una marca, como en los mockups: 23/06/2026. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Un tiempo se lee como tiempo: 4:32, no 272 s. Por debajo del minuto no hay nada que
 * agrupar, así que van los segundos tal cual.
 */
function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${NUMBER.format(seconds)} s`;
  }

  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const rest = pad(total % 60);

  return hours > 0 ? `${String(hours)}:${pad(minutes)}:${rest}` : `${String(minutes)}:${rest}`;
}

export interface FormattableMark {
  value: number;
  unit: 'kg' | 'reps' | 's';
}

/** El valor de una marca con su unidad: "100 kg", "10 reps", "4:32". */
export function formatMark({ value, unit }: FormattableMark): string {
  return unit === 's' ? formatSeconds(value) : `${NUMBER.format(value)} ${unit}`;
}
