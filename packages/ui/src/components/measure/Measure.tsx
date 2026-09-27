import type { HTMLAttributes } from 'react';
import './Measure.css';

/**
 * Los tamaños del diseño: `sm` el aumento (20px), `md` el historial (30px), `lg` el valor
 * actual (38px), `hero` la carga calculada de la barra fija (58px).
 */
export type MeasureSize = 'sm' | 'md' | 'lg' | 'hero';

/** `accent` es el lima: la carga calculada o un aumento. */
export type MeasureTone = 'default' | 'accent';

export interface MeasureProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Ya formateado: "100", "4:32", "+40". El componente no hace cuentas. */
  value: string | number;
  /** En minúscula ("kg", "reps"): la pantalla la muestra en mayúsculas, el lector la lee bien. */
  unit?: string | undefined;
  size?: MeasureSize;
  tone?: MeasureTone;
}

/** Un número grande con su unidad chica al lado, como el "100 KG" del diseño. */
export function Measure({
  value,
  unit,
  size = 'md',
  tone = 'default',
  className,
  ...rest
}: MeasureProps): React.JSX.Element {
  const classes = ['wc-measure', `wc-measure--${size}`, `wc-measure--${tone}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {String(value)}
      {/* El espacio es texto real: sin él, un lector de pantalla lee "100kg" de corrido. */}
      {unit ? (
        <>
          {' '}
          <span className="wc-measure__unit">{unit}</span>
        </>
      ) : null}
    </span>
  );
}
