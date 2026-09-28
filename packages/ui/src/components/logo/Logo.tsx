import './Logo.css';

export interface LogoProps {
  /** `large` es el del splash (mockup 1); el chico, el del header. */
  size?: 'small' | 'large';
}

/**
 * El logo del diseño (`docs/design`): una "W" lima con una barra cruzada, en una caja con borde.
 * Decorativo: el nombre de la marca siempre va en texto al lado (`Wordmark`).
 */
export function Logo({ size = 'small' }: LogoProps): React.JSX.Element {
  return (
    <span aria-hidden="true" className={`wc-logo wc-logo--${size}`}>
      <svg className="wc-logo__mark" viewBox="0 0 40 40" fill="none" focusable="false">
        <path
          className="wc-logo__w"
          d="M6 8 11.5 31 20 15 28.5 31 34 8"
          strokeWidth="3"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path className="wc-logo__bar" d="M14 24h12" strokeWidth="2" />
      </svg>
    </span>
  );
}
