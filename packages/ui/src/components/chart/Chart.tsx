import { useId, useMemo } from 'react';
import { defineChart, dot, lineY } from '@tanstack/charts';
import { scaleLinear } from 'd3-scale';
import { Chart as TanstackChart } from '@tanstack/react-charts';
import './Chart.css';

export interface ChartPoint {
  /** Cómo se llama el punto en el eje: una fecha ya formateada, no un ISO crudo. */
  label: string;
  value: number;
}

export interface ChartProps {
  /** Qué muestra el gráfico. Es su nombre accesible y el de la tabla. */
  label: string;
  /** Unidad de los valores: kg, reps o s. El componente no la interpreta, la muestra. */
  unit: string;
  points: readonly ChartPoint[];
  /** Qué decir cuando no hay nada que dibujar. */
  emptyMessage?: string;
  /** Alto del dibujo en píxeles. Explícito: si no, se calcula solo y se desborda. */
  height?: number;
}

/**
 * La curva de evolución del mockup 10. Es sólo un dibujo: no sabe qué es un RM ni qué
 * período está mirando, se lo dan hecho.
 *
 * El dibujo queda fuera del árbol de accesibilidad y los mismos datos van en una tabla:
 * un gráfico que un lector de pantalla no puede leer no cumple WCAG 2.2 AA, y describirlo
 * con texto alternativo sería peor que dar los números.
 */
export function Chart({
  label,
  unit,
  points,
  emptyMessage = 'Todavía no hay marcas en este período',
  height = 192,
}: ChartProps): React.JSX.Element {
  const id = useId();

  // El eje X es la posición en la serie, no la fecha: los puntos van parejos aunque las
  // marcas estén a meses de distancia, que es como se lee el mockup.
  const definition = useMemo(() => {
    const data = points.map((point, index) => ({ ...point, index }));

    return defineChart({
      // Sin ejes ni grilla: el mockup 10 muestra la curva sola, y los números exactos
      // están en la tabla de abajo.
      scales: {
        x: { scale: scaleLinear, axis: false },
        y: { scale: scaleLinear, axis: false, nice: true },
      },
      margin: 8,
      marks: [
        lineY(data, {
          x: (point) => point.index,
          y: (point) => point.value,
          stroke: 'var(--wc-accent)',
          strokeWidth: 3,
        }),
        // Los puntos gordos del mockup: marcan dónde hubo una marca de verdad.
        dot(data, {
          x: (point) => point.index,
          y: (point) => point.value,
          r: 6,
          fill: 'var(--wc-accent)',
        }),
      ],
    });
  }, [points]);

  if (points.length === 0) {
    return (
      <figure className="wc-chart" aria-labelledby={id}>
        <figcaption id={id} className="wc-chart__caption">
          {label}
        </figcaption>
        <p className="wc-chart__empty">{emptyMessage}</p>
      </figure>
    );
  }

  return (
    <figure className="wc-chart" aria-labelledby={id}>
      <figcaption id={id} className="wc-chart__caption">
        {label}
      </figcaption>

      <div className="wc-chart__plot" style={{ height }} aria-hidden="true">
        {/*
          TanStack Charts es enfocable por defecto: navega los puntos con el teclado. Acá
          adentro de un aria-hidden eso sería un foco que el lector de pantalla no anuncia
          (WCAG 4.1.2), así que sale del orden de tabulación. La tabla de abajo es la
          versión navegable. Lo encontró el axe del E2E (F2-10), no jsdom.
        */}
        <TanstackChart ariaLabel={label} definition={definition} height={height} tabIndex={-1} />
      </div>

      {/* Visualmente oculta, no oculta: es la versión legible de la misma curva. */}
      <table className="wc-chart__table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Marca</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{`${String(point.value)} ${unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
