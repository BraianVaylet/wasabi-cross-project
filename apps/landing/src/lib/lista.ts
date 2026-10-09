/** Una enumeración en español: "A", "A y B", "A, B y C". Sin coma antes de la "y". */
export function listaConY(elementos: readonly string[]): string {
  const ultimo = elementos.at(-1);
  if (ultimo === undefined) return '';
  if (elementos.length === 1) return ultimo;
  return `${elementos.slice(0, -1).join(', ')} y ${ultimo}`;
}
