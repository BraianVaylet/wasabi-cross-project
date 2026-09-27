import { useId, useMemo } from 'react';
import { defineChart, dot, lineY, text } from '@tanstack/charts';
import { scaleLinear } from 'd3-scale';
import { Chart as TanstackChart } from '@tanstack/react-charts';
import './Chart.css';

export interface ChartPoint {
  /** Cómo se llama el punto en el eje: una fecha ya formateada, no un ISO crudo. */
  label: string;
  value: number;
}

export interface ChartProps {
  /** Qué muestra el gráfico: "RM registrado". Es su nombre accesible y el de la tabla. */
  label: string;
  /** Unidad de los valores: kg, reps o s. El componente no la interpreta, la muestra. */
  unit: string;
  points: readonly ChartPoint[];
  /**
   * Cómo se escribe un valor, en el dibujo y en la tabla. Por default, el número con su
   * unidad ("100 kg"); un tiempo lo pasa a mm:ss la pantalla, que es la que sabe qué es.
   * Conviene que sea estable (fuera del componente o memorizada): si cambia, el dibujo se arma
   * de nuevo.
   */
  formatValue?: (value: number) => string;
  /** Qué decir cuando no hay nada que dibujar. */
  emptyMessage?: string;
  /** Alto del dibujo en píxeles. Explícito: si no, se calcula solo y se desborda. */
  height?: number;
}

/**
 * Hasta cuántos puntos llevan su valor escrito arriba. Con más, sólo el último, el valor
 * actual: a 390px de ancho, doce etiquetas de "100 kg" se pisan, y la del primero quedaba
 * encima de la curva. Los demás números están en la tabla. Las fechas de abajo las adelgaza
 * la librería, dejando siempre las puntas.
 */
const MAX_VALUE_LABELS = 5;

/*
 * Los colores del dibujo van por variable CSS, como el resto: el SVG los resuelve contra los
 * tokens. Grilla y eje en el verde azulado del diseño, con su misma transparencia.
 *
 * axe no mide el contraste de un texto dentro de un SVG (lo deja "incompleto"): acá lo
 * garantizan los tokens, medidos sobre `--wc-surface`, el fondo de la caja. Valores 16:1, el
 * actual en lima 12:1, fechas 10.7:1 — con opacidad 1: la librería las apaga al 68% por
 * default, y ahí bajaban a 5.4:1.
 */
const GUIDE = 'var(--wc-border-muted)';

/**
 * El "PROGRESO DEL RM" del diseño: la curva con el valor de cada punto arriba y su fecha
 * abajo, sobre una grilla punteada. Es sólo un dibujo: no sabe qué es un RM ni qué período
 * está mirando, se lo dan hecho.
 *
 * El dibujo queda fuera del árbol de accesibilidad y los mismos datos van en una tabla:
 * un gráfico que un lector de pantalla no puede leer no cumple WCAG 2.2 AA, y describirlo
 * con texto alternativo sería peor que dar los números.
 */
export function Chart({
  label,
  unit,
  points,
  formatValue,
  emptyMessage = 'Todavía no hay marcas en este período',
  height = 104,
}: ChartProps): React.JSX.Element {
  const id = useId();
  const format = useMemo(
    () => formatValue ?? ((value: number) => `${String(value)} ${unit}`),
    [formatValue, unit],
  );

  const definition = useMemo(() => {
    const last = points.length - 1;
    const data = points.map((point, index) => ({
      ...point,
      index,
      text: format(point.value),
      last: index === last,
    }));
    const crowded = data.length > MAX_VALUE_LABELS;
    const labeled = crowded ? data.filter((point) => point.last) : data;
    // Con pocas marcas cada una tiene lugar de sobra y la etiqueta va centrada. Con muchas, el
    // lugar de cada punta es angosto: la etiqueta de la primera arranca en su punto y la de la
    // última termina en el suyo, así no se salen de la caja.
    const anchorAt = (index: number): 'start' | 'middle' | 'end' => {
      if (!crowded) return 'middle';
      if (index === 0) return 'start';
      return index === last ? 'end' : 'middle';
    };

    // Tres líneas de grilla, como el diseño: a la altura de la marca más baja, de la más alta
    // y en el medio. Sin repetir cuando son iguales (una sola marca, o todas iguales).
    const values = points.map((point) => point.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const gridAt = values.length === 0 ? [] : [...new Set([low, (low + high) / 2, high])];

    return defineChart({
      scales: {
        // El eje X es la posición en la serie, no la fecha: los puntos van parejos aunque las
        // marcas estén a meses de distancia, que es como se lee el diseño. Medio lugar de
        // margen a cada lado, para que la etiqueta de la punta no se salga de la caja.
        x: {
          scale: scaleLinear().domain([-0.5, Math.max(last, 0) + 0.5]),
          axis: {
            line: false,
            ticks: {
              values: data.map((point) => point.index),
              format: (index: number) => points[index]?.label ?? '',
              size: 0,
              padding: 6,
            },
            tickLabels: {
              fontSize: 10,
              opacity: 1,
              thin: { priority: 'ends' },
              anchor: ({ index }) => anchorAt(index),
            },
          },
        },
        y: {
          scale: scaleLinear,
          grid: { stroke: GUIDE, strokeOpacity: 0.35, strokeDasharray: '3 5' },
          axis: {
            line: { stroke: GUIDE, strokeOpacity: 0.55 },
            ticks: { values: gridAt, size: 0 },
            tickLabels: false,
          },
        },
      },
      margin: { top: 22, right: 4, bottom: 20, left: 4 },
      theme: { muted: 'var(--wc-text-soft)', foreground: 'var(--wc-text)' },
      marks: [
        lineY(data, {
          x: (point) => point.index,
          y: (point) => point.value,
          stroke: 'var(--wc-accent)',
          strokeWidth: 3,
        }),
        // Las marcas de antes, huecas; la actual, llena: como en el diseño.
        dot(
          data.filter((point) => !point.last),
          {
            x: (point) => point.index,
            y: (point) => point.value,
            r: 5,
            fill: 'var(--wc-surface)',
            stroke: 'var(--wc-accent)',
            strokeWidth: 2,
          },
        ),
        dot(
          data.filter((point) => point.last),
          {
            x: (point) => point.index,
            y: (point) => point.value,
            r: 6,
            fill: 'var(--wc-accent)',
            stroke: 'var(--wc-surface)',
            strokeWidth: 2,
          },
        ),
        text(labeled, {
          x: (point) => point.index,
          y: (point) => point.value,
          text: (point) => point.text,
          dy: -13,
          fontSize: 12,
          anchor: (point) => anchorAt(point.index),
          fill: (point) => (point.last ? 'var(--wc-accent-text)' : 'var(--wc-text)'),
        }),
      ],
    });
  }, [points, format]);

  return (
    <figure className="wc-chart" aria-labelledby={id}>
      <figcaption className="wc-chart__caption">
        <span id={id}>{label}</span>
        <span>Unidad: {unit}</span>
      </figcaption>

      {points.length === 0 ? (
        <p className="wc-chart__empty">{emptyMessage}</p>
      ) : (
        <>
          <div className="wc-chart__plot" style={{ height }} aria-hidden="true">
            {/*
              TanStack Charts es enfocable por defecto: navega los puntos con el teclado. Acá
              adentro de un aria-hidden eso sería un foco que el lector de pantalla no anuncia
              (WCAG 4.1.2), así que sale del orden de tabulación. La tabla de abajo es la
              versión navegable. Lo encontró el axe del E2E (F2-10), no jsdom.
            */}
            <TanstackChart
              ariaLabel={label}
              definition={definition}
              height={height}
              tabIndex={-1}
            />
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
                  <td>{format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </figure>
  );
}
