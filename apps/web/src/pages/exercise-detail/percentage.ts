import { loadPercentageSchema } from '@wasabi-cross/schemas';

/**
 * El porcentaje custom del detalle (mockups 5 y 6). Las reglas son las del perfil —entero,
 * de 1 a 100—, las mismas que valida la API; acá sólo se traduce lo que se tipeó.
 */
export function parsePercentage(input: string): {
  percentage: number | null;
  error: string | null;
} {
  const text = input.trim().replace(',', '.');
  if (text === '') {
    return { percentage: null, error: null };
  }

  const parsed = loadPercentageSchema.safeParse(Number(text));
  if (!parsed.success) {
    return { percentage: null, error: parsed.error.issues[0]?.message ?? 'Porcentaje inválido' };
  }

  return { percentage: parsed.data, error: null };
}
