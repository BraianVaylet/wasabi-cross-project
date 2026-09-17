import type { HTMLAttributes, ReactNode } from 'react';
import './Tag.css';

export type TagVariant = 'outline' | 'solid' | 'neutral';

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  variant?: TagVariant;
  children: ReactNode;
}

/** Etiqueta de contexto: "Light load", "current", tipo de ejercicio. Sólo muestra. */
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
