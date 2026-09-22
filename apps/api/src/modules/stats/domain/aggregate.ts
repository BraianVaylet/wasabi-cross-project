/*
 * El agregado de las estadísticas generales (F2-05, spec §5).
 *
 * Se promedian **variaciones**, nunca valores: un 10% de un RM y un 10% de una carrera se
 * pueden comparar; 120 kg y 272 segundos, no. Así el resumen nunca mezcla unidades.
 */

export interface AggregateEntry<TKey extends string> {
  /** Capacidades o grupos musculares del ejercicio: cuenta en todas. */
  readonly keys: readonly TKey[];
  /** Su variación en el período, o `null` si no tiene marcas suficientes. */
  readonly changePercent: number | null;
}

export interface AggregatedGroup<TKey extends string> {
  readonly key: TKey;
  readonly changePercent: number;
  /** Cuántos ejercicios sostienen el promedio. */
  readonly exercises: number;
}

export interface Aggregation<TKey extends string> {
  /** De la que más progresó a la que menos. */
  readonly groups: AggregatedGroup<TKey>[];
  /** Las que no tienen ningún ejercicio con variación: se informan, no se inventan en cero. */
  readonly insufficient: TKey[];
}

export function aggregateBy<TKey extends string>(
  entries: readonly AggregateEntry<TKey>[],
): Aggregation<TKey> {
  const sums = new Map<TKey, { total: number; exercises: number }>();
  const sinDatos = new Set<TKey>();

  for (const entry of entries) {
    for (const key of entry.keys) {
      if (entry.changePercent === null) {
        sinDatos.add(key);
        continue;
      }

      const current = sums.get(key) ?? { total: 0, exercises: 0 };
      sums.set(key, {
        total: current.total + entry.changePercent,
        exercises: current.exercises + 1,
      });
    }
  }

  const groups = [...sums.entries()]
    .map(([key, { total, exercises }]) => ({
      key,
      changePercent: Math.round((total / exercises) * 10) / 10,
      exercises,
    }))
    .sort((a, b) => b.changePercent - a.changePercent);

  return {
    groups,
    // Una clave con un solo ejercicio medible ya se puede informar: no es insuficiente.
    insufficient: [...sinDatos].filter((key) => !sums.has(key)),
  };
}
