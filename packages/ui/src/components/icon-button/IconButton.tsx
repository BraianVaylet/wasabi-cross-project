import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './IconButton.css';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  /** El nombre accesible. Obligatorio: un botón que sólo tiene un ícono no dice nada. */
  label: string;
  /** El ícono. Es decorativo. */
  children: ReactNode;
}

/** Botón cuadrado de sólo ícono, como el del menú en el header (spec §5.2). */
export function IconButton({
  label,
  className,
  type = 'button',
  children,
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={['wc-icon-button', className].filter(Boolean).join(' ')}
      aria-label={label}
      {...rest}
    >
      <span aria-hidden="true" className="wc-icon-button__icon">
        {children}
      </span>
    </button>
  );
}
