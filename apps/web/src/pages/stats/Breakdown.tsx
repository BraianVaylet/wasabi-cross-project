import type { TrainingBreakdown } from '@wasabi-cross/schemas';
import type { UseQueryResult } from '@tanstack/react-query';
import { Donut, RankBars, SectionHeader, Skeleton } from '@wasabi-cross/ui';
import { ErrorNotice } from '../../app/ErrorNotice.tsx';
import {
  CATEGORY_LABEL,
  DISCIPLINE_LABEL,
  MUSCLE_GROUP_LABEL,
  SEGMENT_LABEL,
} from '../../lib/labels.ts';

export interface BreakdownProps {
  breakdown: UseQueryResult<TrainingBreakdown>;
}

function ejercicios(count: number): string {
  return count === 1 ? '1 ejercicio' : `${String(count)} ejercicios`;
}

/** "2 como primario y 1 como secundario": lo que la barra dice con sus dos tramos. */
function roles(primary: number, secondary: number): string {
  return `${String(primary)} como primario y ${String(secondary)} como secundario`;
}

/**
 * "Tu entrenamiento" (spec §5.4): cómo se reparten los ejercicios que el atleta tiene
 * cargados. No mira el período, y lo dice. Los números vienen hechos de la API: acá sólo se
 * ponen nombres.
 */
export function Breakdown({ breakdown }: BreakdownProps): React.JSX.Element | null {
  if (breakdown.isPending) {
    return <Skeleton label="Cargando tu entrenamiento" count={2} />;
  }

  if (breakdown.isError) {
    return <ErrorNotice error={breakdown.error} />;
  }

  const { data } = breakdown;
  if (data.exercises === 0) {
    return null;
  }

  const mentions = data.byDiscipline.reduce((total, share) => total + share.exercises, 0);
  const total = { value: String(data.exercises), caption: 'ejercicios' };

  return (
    <section className="stats__general" aria-labelledby="stats-entrenamiento">
      <SectionHeader
        id="stats-entrenamiento"
        title="Tu entrenamiento"
        meta="Todos tus ejercicios"
      />

      <div className="stats__charts">
        <Donut
          label="Disciplinas"
          // Un ejercicio cuenta en cada disciplina que tiene: el total son menciones.
          total={{ value: String(mentions), caption: 'menciones' }}
          formatValue={ejercicios}
          slices={data.byDiscipline.map((share) => ({
            key: share.discipline ?? 'sin-disciplina',
            label:
              share.discipline === null ? 'Sin disciplina' : DISCIPLINE_LABEL[share.discipline],
            value: share.exercises,
            percent: share.percent,
            muted: share.discipline === null,
          }))}
        />

        <Donut
          label="Categorías"
          total={total}
          formatValue={ejercicios}
          slices={data.byCategory.map((share) => ({
            key: share.category,
            label: CATEGORY_LABEL[share.category],
            value: share.exercises,
            percent: share.percent,
          }))}
        />

        <Donut
          label="Segmento del cuerpo"
          total={total}
          formatValue={ejercicios}
          slices={data.bySegment.map((share) => ({
            key: share.segment,
            label: SEGMENT_LABEL[share.segment],
            value: share.exercises,
            percent: share.percent,
          }))}
        />

        <RankBars
          label="Grupos musculares"
          legend={{ strong: 'Primario', soft: 'Secundario ½' }}
          rows={data.byMuscleGroup.map((group) => ({
            key: group.muscleGroup,
            label: MUSCLE_GROUP_LABEL[group.muscleGroup],
            // Los tramos en puntaje, como los cuenta la API (spec §5.4): lo que no es del
            // primario es de los secundarios.
            strong: group.primary,
            soft: group.score - group.primary,
            valueText: `${String(group.percent)}%`,
            description: roles(group.primary, group.secondary),
          }))}
        />
      </div>
    </section>
  );
}
