import { COLORES, ESCALAS, FORMAS, LADO, RADIO_ESQUINA, transformDeEscala } from './marca.ts';
import './Logo.css';

export interface LogoProps {
  /** `large` es el del splash (mockup 1); el chico, el del header. */
  size?: 'small' | 'large';
}

/**
 * La marca: una W blanca sobre una ficha verde. Es el mismo
 * dibujo que el favicon y el ícono de la PWA (`apps/web/public`): los tres salen de `marca.ts`.
 * Decorativo: el nombre de la marca siempre va en texto al lado (`Wordmark`).
 */
export function Logo({ size = 'small' }: LogoProps): React.JSX.Element {
  return (
    <span aria-hidden="true" className={`wc-logo wc-logo--${size}`}>
      <svg
        className="wc-logo__mark"
        viewBox={`0 0 ${String(LADO)} ${String(LADO)}`}
        focusable="false"
      >
        <rect width={LADO} height={LADO} rx={RADIO_ESQUINA} fill={COLORES.fondo} />
        <g transform={transformDeEscala(ESCALAS.icono)}>
          {FORMAS.map((forma) => (
            <path key={forma.d} d={forma.d} fill={forma.relleno} />
          ))}
        </g>
      </svg>
    </span>
  );
}
