import type { Capacity, GeneralStats as Summary, MuscleGroup } from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Skeleton } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import { CAPACITY_LABEL, MUSCLE_GROUP_LABEL } from '../../lib/labels.ts';
import { formatChange } from './change.ts';

export interface GeneralStatsProps {
  stats: UseQueryResult<Summary>;
}

/**
 * La segunda mitad del mockup 10: cómo viene cada capacidad y cada grupo muscular. Se lee
 * como texto, en orden: el primero es el que más progresó (lo ordena la API, F2-05).
 */
export function GeneralStats({ stats }: GeneralStatsProps): React.JSX.Element | null {
  if (stats.isPending) {
    return <Skeleton label="Cargando tu resumen" count={2} />;
  }

  if (stats.isError) {
    return <ErrorNotice error={stats.error} />;
  }

  const { byCapacity, byMuscleGroup, insufficient } = stats.data;
  const vacio =
    byCapacity.length === 0 &&
    byMuscleGroup.length === 0 &&
    insufficient.capacities.length === 0 &&
    insufficient.muscleGroups.length === 0;

  // Sin nada que comparar no se muestra una sección vacía: el atleta recién empieza.
  if (vacio) {
    return null;
  }

  return (
    <section className="stats__general" aria-labelledby="stats-general">
      <h2 id="stats-general" className="stats__general-title">
        En general
      </h2>

      <Group
        title="Por capacidad"
        rows={byCapacity.map((entry) => ({
          key: entry.capacity,
          label: CAPACITY_LABEL[entry.capacity],
          changePercent: entry.changePercent,
          exercises: entry.exercises,
        }))}
        missing={insufficient.capacities.map((capacity) => CAPACITY_LABEL[capacity])}
      />

      <Group
        title="Por grupo muscular"
        rows={byMuscleGroup.map((entry) => ({
          key: entry.muscleGroup,
          label: MUSCLE_GROUP_LABEL[entry.muscleGroup],
          changePercent: entry.changePercent,
          exercises: entry.exercises,
        }))}
        missing={insufficient.muscleGroups.map((group) => MUSCLE_GROUP_LABEL[group])}
      />
    </section>
  );
}

interface GroupRow {
  key: Capacity | MuscleGroup;
  label: string;
  changePercent: number;
  exercises: number;
}

function Group({
  title,
  rows,
  missing,
}: {
  title: string;
  rows: GroupRow[];
  missing: string[];
}): React.JSX.Element | null {
  if (rows.length === 0 && missing.length === 0) {
    return null;
  }

  return (
    <>
      <h3 className="stats__general-subtitle">{title}</h3>

      {rows.length > 0 ? (
        <ul className="stats__general-list">
          {rows.map((row) => (
            <li key={row.key} className="stats__general-row">
              <span className="stats__general-label">{row.label}</span>
              <span
                className={`stats__general-change${row.changePercent < 0 ? ' stats__general-change--down' : ''}`}
              >
                {formatChange(row.changePercent)}
              </span>
              <span className="stats__general-count">
                {row.exercises === 1 ? '1 ejercicio' : `${String(row.exercises)} ejercicios`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {missing.length > 0 ? (
        <p className="stats__general-missing">
          En {missing.join(', ')} todavía no hay marcas suficientes para comparar.
        </p>
      ) : null}
    </>
  );
}
