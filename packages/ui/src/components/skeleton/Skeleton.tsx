import './Skeleton.css';

export interface SkeletonProps {
  /** Qué se está cargando. Es el nombre accesible de todo el bloque. */
  label: string;
  /** Cuántas piezas mostrar, para que el hueco se parezca a lo que viene. */
  count?: number;
}

/**
 * El hueco de lo que está por llegar (spec §11: skeletons, no spinners). Una sola región
 * `status`: las piezas son decorativas, así el lector de pantalla no repite el aviso.
 */
export function Skeleton({ label, count = 1 }: SkeletonProps): React.JSX.Element {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="wc-skeleton">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} aria-hidden="true" className="wc-skeleton__piece" />
      ))}
    </div>
  );
}
