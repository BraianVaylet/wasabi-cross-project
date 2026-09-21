/**
 * Forma de comparar nombres de ejercicios: sin distinguir mayúsculas, acentos ni espacios
 * de más. "Elevacion de gemelos", "elevación DE gemelos" y "Elevación de gemelos" son el
 * mismo ejercicio.
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function sameName(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

/** ¿`name` contiene `query`, con la misma regla de comparación? */
export function nameMatches(name: string, query: string): boolean {
  return normalizeName(name).includes(normalizeName(query));
}
