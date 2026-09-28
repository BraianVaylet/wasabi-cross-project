import './Wordmark.css';

export interface WordmarkProps {
  /** El renglón chico de abajo, como el "FUERZA · REGISTRO DE RM" del header del diseño. */
  subtitle?: string;
  /** `large` es el del splash. */
  size?: 'small' | 'large';
}

/**
 * El nombre de la marca como en el diseño: "WASABI // CROSS", con las barras en lima. Las barras
 * son contenido CSS con texto alternativo vacío: se ven, pero el texto y el nombre accesible
 * siguen siendo "Wasabi Cross" (un lector de pantalla no lee "barra barra").
 */
export function Wordmark({ subtitle, size = 'small' }: WordmarkProps): React.JSX.Element {
  return (
    <span className={`wc-wordmark wc-wordmark--${size}`}>
      <span className="wc-wordmark__name">
        Wasabi <span className="wc-wordmark__slash" aria-hidden="true" /> Cross
      </span>
      {/* Un eslogan: no suma al nombre del link a Home, que queda "Wasabi Cross". */}
      {subtitle ? (
        <span className="wc-wordmark__subtitle" aria-hidden="true">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
