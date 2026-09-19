import { ImageIcon } from '../icons/icons.tsx';
import './Logo.css';

export interface LogoProps {
  /** `large` es el del splash (mockup 1); el chico, el del header (mockup 4). */
  size?: 'small' | 'large';
}

/**
 * El logo de Wasabi Cross. Todavía no hay imagen de marca (spec §11): es el marcador de los
 * mockups. Decorativo: el nombre de la marca siempre va en texto al lado.
 */
export function Logo({ size = 'small' }: LogoProps): React.JSX.Element {
  return (
    <span aria-hidden="true" className={`wc-logo wc-logo--${size}`}>
      <ImageIcon />
    </span>
  );
}
