import type { HTMLAttributes, ReactNode } from 'react';
import './Tag.css';

export type TagVariant = 'outline' | 'solid' | 'neutral' | 'danger' | 'success' | 'warning';

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  variant?: TagVariant;
  children: ReactNode;
}

/**
 * Etiqueta de contexto: "Carga liviana", "current", la categoría del ejercicio. Sólo
 * muestra. `danger` es para el "con dolor" del detalle (mockup 5), en rojo; `success` y
 * `warning` los usa la banda de carga (verde/ámbar) del mismo detalle.
 */
export function Tag({
  variant = 'outline',
  className,
  children,
  ...rest
}: TagProps): React.JSX.Element {
  const classes = ['wc-tag', `wc-tag--${variant}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
