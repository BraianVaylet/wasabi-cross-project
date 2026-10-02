import { useId } from 'react';
import './RankBars.css';

export interface RankBarRow {
  /** Estable entre renders: identifica la fila, no se muestra. */
  key: string;
  label: string;
  /** El tramo lleno de la barra. */
  strong: number;
  /** El tramo claro, a continuación del lleno. */
  soft: number;
  /** El número que se ve a la derecha: "25%". */
  valueText: string;
  /** Lo que lee un lector de pantalla además del número: "2 como primario y 1 como secundario". */
  description?: string;
}

export interface RankBarsProps {
  /** Qué ordena: "Grupos musculares". Es el nombre accesible de la lista. */
  label: string;
  rows: readonly RankBarRow[];
  /** Cómo se llaman los dos tramos, para la leyenda: "Primario" y "Secundario". */
  legend: { strong: string; soft: string };
  emptyMessage?: string;
}

/**
 * Barras horizontales ordenadas, en HTML: el texto es texto de verdad y se lee en orden. Cada
 * barra tiene dos tramos —lleno y claro, el mismo tono— y su largo es proporcional a la fila
 * más grande. Es sólo un dibujo: el orden y los números vienen hechos.
 */
export function RankBars({
  label,
  rows,
  legend,
  emptyMessage = 'Todavía no hay nada para mostrar',
}: RankBarsProps): React.JSX.Element {
  const id = useId();
  const max = Math.max(...rows.map((row) => row.strong + row.soft));

  return (
    <figure className="wc-rank-bars" aria-labelledby={id}>
      <figcaption className="wc-rank-bars__caption">
        <span id={id}>{label}</span>
        {/* La leyenda de los tramos: lo que el color dice, también escrito. */}
        <span className="wc-rank-bars__legend">
          <span className="wc-rank-bars__key">
            <span
              className="wc-rank-bars__swatch wc-rank-bars__swatch--strong"
              aria-hidden="true"
            />
            {legend.strong}
          </span>
          <span className="wc-rank-bars__key">
            <span className="wc-rank-bars__swatch wc-rank-bars__swatch--soft" aria-hidden="true" />
            {legend.soft}
          </span>
        </span>
      </figcaption>

      {rows.length === 0 ? (
        <p className="wc-rank-bars__empty">{emptyMessage}</p>
      ) : (
        <ol className="wc-rank-bars__list" aria-labelledby={id}>
          {rows.map((row) => (
            <li key={row.key} className="wc-rank-bars__row">
              <span className="wc-rank-bars__label">{row.label}</span>
              {/* Un tramo en cero no se dibuja: si no, el hueco entre tramos quedaría solo. */}
              <span className="wc-rank-bars__track" aria-hidden="true">
                {row.strong > 0 ? (
                  <span
                    className="wc-rank-bars__bar wc-rank-bars__bar--strong"
                    style={{ width: `${String((row.strong / max) * 100)}%` }}
                  />
                ) : null}
                {row.soft > 0 ? (
                  <span
                    className="wc-rank-bars__bar wc-rank-bars__bar--soft"
                    style={{ width: `${String((row.soft / max) * 100)}%` }}
                  />
                ) : null}
              </span>
              <span className="wc-rank-bars__value">
                {row.valueText}
                {row.description === undefined ? null : (
                  <span className="wc-rank-bars__description">{`: ${row.description}`}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
