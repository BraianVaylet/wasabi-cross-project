import { useId, useMemo } from 'react';
import { barY, defineChart, text } from '@tanstack/charts';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from 'd3-scale';
import { Chart as TanstackChart } from '@tanstack/react-charts';
import '../chart/Chart.css';
import './ColumnChart.css';

export interface ColumnChartColumn {
  /** Estable y único: identifica la columna en el eje. */
  key: string;
  /** Cómo se llama la columna abajo: "jul", ya formateado. */
  label: string;
  value: number;
}

export interface ColumnChartProps {
  /** Qué cuenta: "Marcas por mes". Es su nombre accesible y el de la tabla. */
  label: string;
  /** Qué dice la columna de los valores en la tabla: "Marcas". */
  valueLabel: string;
  /** Qué dice la columna de las etiquetas en la tabla: "Mes". */
  columnLabel: string;
  columns: readonly ColumnChartColumn[];
  emptyMessage?: string;
  /** Alto del dibujo en píxeles. */
  height?: number;
}

/** Desde cuántas columnas las etiquetas de las puntas se anclan a los bordes. */
const CROWDED = 6;

/**
 * Columnas de una sola serie: cuánto hubo en cada mes. El cero se ve como cero —sin columna,
 * con la etiqueta del mes igual— porque un mes sin marcas es un dato (spec §5.4).
 *
 * Como `Chart`, el dibujo queda fuera del árbol de accesibilidad y los mismos números van en
 * una tabla visualmente oculta. Es sólo un dibujo: los meses y los conteos vienen hechos.
 */
export function ColumnChart({
  label,
  valueLabel,
  columnLabel,
  columns,
  emptyMessage = 'Todavía no hay datos en este período',
  height = 112,
}: ColumnChartProps): React.JSX.Element {
  const id = useId();

  const definition = useMemo(() => {
    const keys = columns.map((column) => column.key);
    const labels = new Map(columns.map((column) => [column.key, column.label]));
    const max = Math.max(1, ...columns.map((column) => column.value));
    const last = columns.length - 1;
    // Con muchas columnas cada banda es angosta y "oct 25" no entra centrado: la etiqueta de la
    // primera arranca en el borde de su banda y la de la última termina en el suyo, así no se
    // salen de la caja. Con pocas, todas centradas.
    const crowded = columns.length > CROWDED;
    const anchorAt = (index: number): 'start' | 'middle' | 'end' => {
      if (!crowded) return 'middle';
      if (index === 0) return 'start';
      return index === last ? 'end' : 'middle';
    };
    const shiftAt = (index: number, bandwidth: number): number =>
      ({ start: -bandwidth / 2, middle: 0, end: bandwidth / 2 })[anchorAt(index)];

    return defineChart({
      scales: {
        x: {
          scale: () => scaleBand().domain(keys).padding(0.24),
          axis: {
            line: { stroke: 'var(--wc-border-muted)', strokeOpacity: 0.55 },
            ticks: { size: 0, padding: 6, format: (key: string) => labels.get(key) ?? key },
            tickLabels: {
              fontSize: 11,
              opacity: 1,
              thin: { priority: 'ends' },
              anchor: ({ index }) => anchorAt(index),
              dx: ({ index, bandwidth }) => shiftAt(index, bandwidth),
            },
          },
        },
        y: {
          scale: scaleLinear().domain([0, max]),
          axis: false,
        },
      },
      margin: { top: 18, right: 0, bottom: 20, left: 0 },
      theme: { muted: 'var(--wc-text-soft)', foreground: 'var(--wc-text)' },
      marks: [
        barY(columns, {
          x: (column) => column.key,
          y: (column) => column.value,
          key: (column) => column.key,
          fill: 'var(--wc-accent)',
          maxThickness: 24,
        }),
        // El número arriba de cada columna con algo: el cero ya se lee en la ausencia.
        text(
          columns.filter((column) => column.value > 0),
          {
            x: (column) => column.key,
            y: (column) => column.value,
            text: (column) => String(column.value),
            dy: -7,
            fontSize: 11,
            anchor: 'middle',
            fill: 'var(--wc-text)',
          },
        ),
      ],
    });
  }, [columns]);

  return (
    <figure className="wc-chart wc-column-chart" aria-labelledby={id}>
      <figcaption className="wc-chart__caption">
        <span id={id}>{label}</span>
      </figcaption>

      {columns.length === 0 ? (
        <p className="wc-chart__empty">{emptyMessage}</p>
      ) : (
        <>
          <div className="wc-chart__plot" style={{ height }} aria-hidden="true">
            {/* Como en Chart: el dibujo no se enfoca, la tabla es la versión navegable. */}
            <TanstackChart
              ariaLabel={label}
              definition={definition}
              height={height}
              tabIndex={-1}
            />
          </div>

          <table className="wc-chart__table" aria-label={label}>
            <thead>
              <tr>
                <th scope="col">{columnLabel}</th>
                <th scope="col">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => (
                <tr key={column.key}>
                  <th scope="row">{column.label}</th>
                  <td>{column.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
