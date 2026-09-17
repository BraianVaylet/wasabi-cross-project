import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Ocupa todo el ancho disponible, como el "New Exercice" de los mockups. */
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  block = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const classes = ['wc-button', `wc-button--${variant}`, block ? 'wc-button--block' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    // `type` explícito: el default del HTML es "submit" y dentro de un form manda el
    // formulario sin que nadie lo haya pedido.
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
