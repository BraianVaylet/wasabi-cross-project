/** Cómo se lee una variación: con signo, porque bajar también es un dato. */
export function formatChange(percent: number): string {
  return `${percent > 0 ? '+' : ''}${String(percent)}%`;
}
