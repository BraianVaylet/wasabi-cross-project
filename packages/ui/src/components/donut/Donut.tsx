import { useId, useMemo } from 'react';
import { defineChart } from '@tanstack/charts';
import { pie, polar, radialArc } from '@tanstack/charts/polar';
import { Chart as TanstackChart } from '@tanstack/react-charts';
import './Donut.css';

export interface DonutSlice {
  /** Estable entre renders: identifica la porción, no se muestra. */
  key: string;
  label: string;
  /** Cuánto pesa la porción: lo que define su ángulo. */
  value: number;
  /** Su parte del total, ya calculada: la pantalla sabe redondear para que sumen 100. */
  percent: number;
  /** Gris y al final: lo que no es una categoría de verdad, como "Sin disciplina". */
  muted?: boolean;
}

export interface DonutProps {
  /** Qué reparte: "Disciplinas". Es el nombre accesible del gráfico y de la leyenda. */
  label: string;
  slices: readonly DonutSlice[];
  /** El número grande del centro y lo que cuenta: "8" y "menciones". */
  total: { value: string; caption: string };
  /** Cómo se escribe el valor de una porción en la leyenda: "2 ejercicios". */
  formatValue?: (value: number) => string;
  /** Cómo se llama la porción que junta las chicas cuando hay más de seis. */
  otherLabel?: string;
  /** Qué decir cuando no hay nada que repartir. */
  emptyMessage?: string;
  /** Lado del dibujo, en píxeles. */
  size?: number;
}

/**
 * Más de seis porciones no se distinguen de un vistazo, y la paleta validada tiene seis
 * colores (spec §5.4): con más, las cinco primeras y una que junta el resto.
 */
const MAX_SLICES = 6;

interface Segment {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  /** Lo que junta "Otras", para decirlo en la leyenda. */
  members: string[];
}

/**
 * Ordena y colorea: las grises al final y, si sobran porciones, las últimas se juntan. Los
 * colores van en el orden de la paleta y sin saltear, porque la validación es entre vecinas.
 */
function segmentsFrom(slices: readonly DonutSlice[], otherLabel: string): Segment[] {
  const ordered = [
    ...slices.filter((slice) => slice.muted !== true),
    ...slices.filter((slice) => slice.muted === true),
  ];
  const kept = ordered.length > MAX_SLICES ? ordered.slice(0, MAX_SLICES - 1) : ordered;
  const folded = ordered.slice(kept.length);
  let colored = 0;

  // A lo sumo seis con color: los lugares de la paleta alcanzan siempre.
  const segments = kept.map((slice): Segment => {
    if (slice.muted === true) {
      return { ...slice, color: 'var(--wc-chart-other)', members: [] };
    }
    colored += 1;
    return { ...slice, color: `var(--wc-chart-${String(colored)})`, members: [] };
  });

  if (folded.length > 0) {
    segments.push({
      key: '__otras',
      label: otherLabel,
      value: folded.reduce((sum, slice) => sum + slice.value, 0),
      percent: folded.reduce((sum, slice) => sum + slice.percent, 0),
      color: 'var(--wc-chart-other)',
      members: folded.map((slice) => slice.label),
    });
  }

  return segments;
}

/**
 * Una dona: cómo se reparte un total en partes. El dibujo es de TanStack Charts y queda fuera
 * del árbol de accesibilidad; lo que se lee es la leyenda, que escribe cada porción con su
 * valor y su porcentaje. Ningún dato vive sólo en el color.
 *
 * Es sólo un dibujo: no sabe qué es una disciplina ni redondea porcentajes, los recibe hechos.
 */
export function Donut({
  label,
  slices,
  total,
  formatValue = String,
  otherLabel = 'Otras',
  emptyMessage = 'Todavía no hay nada para mostrar',
  size = 120,
}: DonutProps): React.JSX.Element {
  const id = useId();
  const segments = useMemo(() => segmentsFrom(slices, otherLabel), [slices, otherLabel]);

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          polar({
            inset: 2,
            marks: [
              radialArc(pie(segments, { value: (segment) => segment.value }), {
                innerRadius: ({ radius }) => radius * 0.62,
                key: (slice) => slice.key,
                fill: (slice) => slice.color,
                // El hueco entre porciones es del color del fondo: separa vecinas parecidas.
                stroke: 'var(--wc-surface)',
                strokeWidth: 2,
              }),
            ],
            scales: { angle: null, radius: null },
          }),
        ],
        scales: { x: null, y: null },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
    [segments],
  );

  return (
    <figure className="wc-donut" aria-labelledby={id}>
      <figcaption id={id} className="wc-donut__caption">
        {label}
      </figcaption>

      {segments.length === 0 ? (
        <p className="wc-donut__empty">{emptyMessage}</p>
      ) : (
        <div className="wc-donut__body">
          <div className="wc-donut__ring" style={{ width: size, height: size }}>
            <div className="wc-donut__plot" aria-hidden="true">
              {/* Como en Chart: el dibujo no se enfoca, la leyenda es la versión navegable. */}
              <TanstackChart
                ariaLabel={label}
                definition={definition}
                height={size}
                tabIndex={-1}
              />
            </div>
            <p className="wc-donut__total">
              <span className="wc-donut__total-value">{total.value}</span>
              <span className="wc-donut__total-caption">{total.caption}</span>
            </p>
          </div>

          <ul className="wc-donut__legend" aria-label={label}>
            {segments.map((segment) => (
              <li key={segment.key} className="wc-donut__item">
                <span
                  className="wc-donut__swatch"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
                {/* El valor va debajo del nombre: a 375px, en una sola fila no entran los tres. */}
                <span className="wc-donut__name">
                  {segment.label}
                  <span className="wc-donut__detail">{formatValue(segment.value)}</span>
                  {segment.members.length > 0 ? (
                    <span className="wc-donut__detail">{segment.members.join(', ')}</span>
                  ) : null}
                </span>
                <span className="wc-donut__percent">{String(segment.percent)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
