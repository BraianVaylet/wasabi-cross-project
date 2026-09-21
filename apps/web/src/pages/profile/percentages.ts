import { loadPercentageSchema, loadPercentagesSchema } from '@wasabi-cross/schemas';

/*
 * Los porcentajes del perfil, campo por campo. Las reglas son las de
 * `@wasabi-cross/schemas` —las mismas que aplica la API—; acá sólo se decide **dónde** se
 * muestra cada error, que es lo que el schema no puede saber: un repetido es culpa del
 * campo que repite, no de la lista entera.
 */

export type PercentagesResult =
  | { ok: true; percentages: number[] }
  | { ok: false; fields: Record<number, string>; group?: string };

function fieldError(value: string): string | null {
  const text = value.trim();
  if (text === '') {
    return 'Poné un porcentaje o quitá el campo';
  }

  const parsed = loadPercentageSchema.safeParse(Number(text.replace(',', '.')));
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? 'Porcentaje inválido');
}

export function validatePercentages(values: readonly string[]): PercentagesResult {
  const fields: Record<number, string> = {};
  const seen = new Map<number, number>();

  values.forEach((value, index) => {
    const error = fieldError(value);
    if (error !== null) {
      fields[index] = error;
      return;
    }

    const parsed = Number(value.trim().replace(',', '.'));
    if (seen.has(parsed)) {
      fields[index] = 'Ese porcentaje está repetido';
      return;
    }
    seen.set(parsed, index);
  });

  if (Object.keys(fields).length > 0) {
    return { ok: false, fields };
  }

  // Lo que es del conjunto —cuántos hay— lo dice el schema compartido.
  const percentages = [...seen.keys()];
  const group = loadPercentagesSchema.safeParse(percentages);
  if (!group.success) {
    return { ok: false, fields, group: group.error.issues[0]?.message ?? 'Lista inválida' };
  }

  return { ok: true, percentages };
}
