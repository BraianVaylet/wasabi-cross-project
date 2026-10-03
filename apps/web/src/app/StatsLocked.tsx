import { ERROR_CATALOG, type ErrorCode } from '@wasabi-cross/schemas';
import { Link } from '@tanstack/react-router';
import { ApiError } from '../lib/http.ts';
import './stats-locked.css';

/** "Las estadísticas son parte del plan Pro": lo que responde la API a un usuario Free. */
export const STATS_LOCKED_CODE = 'WC-SUBS-403-002' satisfies ErrorCode;

/**
 * ¿Es la API diciendo que el plan no incluye las estadísticas? Pasa si el plan cambió en otro
 * dispositivo y esta pantalla todavía creía lo contrario: en ese caso se muestra el mismo aviso
 * que a un usuario Free, no un error con un código (spec §5.5).
 */
export function isStatsLocked(error: unknown): boolean {
  return error instanceof ApiError && error.errorCode === STATS_LOCKED_CODE;
}

/**
 * El aviso que ocupa el lugar de las estadísticas con plan Free (spec §5.5): qué pasa, qué
 * incluye Pro y el camino a la suscripción. El texto sale del catálogo de errores, así la pantalla
 * y la API dicen lo mismo.
 */
export function StatsLocked(): React.JSX.Element {
  return (
    <div className="stats-locked">
      <p className="stats-locked__title">{ERROR_CATALOG[STATS_LOCKED_CODE].userMessage}</p>
      <p className="stats-locked__hint">
        Con Pro ves la evolución de cada ejercicio y cómo viene tu entrenamiento. Cargar ejercicios
        y marcas sigue siendo libre.
      </p>
      <Link to="/suscripcion" className="wc-button wc-button--secondary wc-button--block">
        Ver planes
      </Link>
    </div>
  );
}
