import type { ReactNode } from 'react';
import './SectionHeader.css';

export interface SectionHeaderProps {
  title: ReactNode;
  /** Va en el título: la sección lo usa de nombre con `aria-labelledby`. */
  id?: string;
  /** `3` para una sección adentro de otra. */
  level?: 2 | 3;
  /** La etiqueta chica de arriba, como el "TENDENCIA DE FUERZA" del diseño. */
  kicker?: ReactNode;
  /** El dato de la derecha: "PORCENTAJE DEL RM", "03 REGISTROS", el aumento. */
  meta?: ReactNode;
  /** La línea de abajo. Sí por default; el "PROGRESO DEL RM" del diseño va sin ella. */
  divider?: boolean;
  className?: string;
}

/**
 * El encabezado de cada sección del diseño: el título en la condensada a la izquierda, un
 * dato chico a la derecha, y una línea abajo. Sólo acomoda: qué dice lo decide la pantalla.
 */
export function SectionHeader({
  title,
  id,
  level = 2,
  kicker,
  meta,
  divider = true,
  className,
}: SectionHeaderProps): React.JSX.Element {
  const Heading = level === 2 ? 'h2' : 'h3';
  const classes = ['wc-section-header', divider ? 'wc-section-header--divider' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className="wc-section-header__main">
        {kicker ? <p className="wc-kicker wc-section-header__kicker">{kicker}</p> : null}
        <Heading id={id} className="wc-section-header__title">
          {title}
        </Heading>
      </div>
      {meta ? <div className="wc-section-header__meta">{meta}</div> : null}
    </div>
  );
}
