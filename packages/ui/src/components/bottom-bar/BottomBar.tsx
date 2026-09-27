import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './BottomBar.css';

export interface BottomBarProps {
  /** El nombre de la región: "Carga seleccionada". */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * La barra fija de abajo del diseño, con la carga calculada y el "Registrar nuevo RM". Va al
 * final del contenido de la pantalla.
 *
 * Una barra fija tapa lo último de la página. Para que no pase, deja en su lugar un espacio
 * vacío del mismo alto que ella, medido cada vez que cambia (una carga de dos líneas, la
 * fuente que termina de cargar). Sin `ResizeObserver`, el espacio queda con un alto por
 * default del CSS que alcanza para el caso del diseño.
 */
export function BottomBar({ label, children, className }: BottomBarProps): React.JSX.Element {
  const barRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setHeight(bar.getBoundingClientRect().height);
    });
    observer.observe(bar);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className="wc-bottom-bar__spacer"
        style={height === undefined ? undefined : { height }}
      />
      <section
        ref={barRef}
        aria-label={label}
        className={['wc-bottom-bar', className].filter(Boolean).join(' ')}
      >
        <div className="wc-bottom-bar__content">{children}</div>
      </section>
    </>
  );
}
