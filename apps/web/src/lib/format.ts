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

const DURATION = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})$/;

/**
 * Lo que se escribe en el campo de un ejercicio de tiempo: `4:32`, `1:02:05`, o segundos
 * sueltos (`45`, `12,4`). Devuelve `null` si no es un tiempo; el formulario avisa.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().replace(',', '.');
  if (text === '') {
    return null;
  }

  if (!text.includes(':')) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
  }

  const parts = DURATION.exec(text);
  if (!parts) {
    return null;
  }

  const [hours, minutes, seconds] = [parts[1] ?? '0', parts[2] ?? '0', parts[3] ?? '0'].map(Number);
  // 4:72 no es un tiempo: quien lo escribió quiso decir otra cosa.
  if (minutes === undefined || seconds === undefined || hours === undefined) {
    return null;
  }
  if (seconds > 59 || (parts[1] !== undefined && minutes > 59)) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}
