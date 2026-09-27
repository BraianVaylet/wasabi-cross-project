import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import './Card.css';

/**
 * `plain` es la superficie de siempre. `current` y `past` son las dos del historial del diseño:
 * la marca actual (oliva, borde lima) y las anteriores (sobrias, con un filo violeta a la
 * izquierda).
 */
export type CardVariant = 'plain' | 'current' | 'past';

interface CommonCardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
}

type StaticCardProps = CommonCardProps &
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'> & { onClick?: undefined };

type InteractiveCardProps = CommonCardProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    onClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>['onClick']>;
  };

export type CardProps = StaticCardProps | InteractiveCardProps;

/**
 * Superficie base de la app. Si recibe `onClick` se renderiza como `<button>` y no como
 * un `<div>` con handler: así funciona con teclado y los lectores de pantalla la anuncian
 * como lo que es (spec §11, WCAG 2.2 AA).
 */
export function Card({
  variant = 'plain',
  className,
  children,
  ...rest
}: CardProps): React.JSX.Element {
  const classes = [
    'wc-card',
    `wc-card--${variant}`,
    rest.onClick ? 'wc-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (rest.onClick) {
    const { onClick, ...buttonProps } = rest as InteractiveCardProps;

    return (
      <button type="button" className={classes} onClick={onClick} {...buttonProps}>
        {children}
      </button>
    );
  }

  const { onClick: _ignored, ...divProps } = rest as StaticCardProps;

  return (
    <div className={classes} {...divProps}>
      {children}
    </div>
  );
}
