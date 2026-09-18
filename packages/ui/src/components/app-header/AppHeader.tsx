import type { ReactNode } from 'react';
import './AppHeader.css';

export interface AppHeaderProps {
  /** Logo y nombre. Llega armado para que la app lo envuelva en su link a Home. */
  brand: ReactNode;
  /** Los botones de la derecha: tema y menú (mockup 4). */
  actions: ReactNode;
}

/** El header global (spec §5, mockup 4a): la marca a la izquierda y las acciones a la derecha. */
export function AppHeader({ brand, actions }: AppHeaderProps): React.JSX.Element {
  return (
    <header className="wc-app-header">
      <div className="wc-app-header__brand">{brand}</div>
      <div className="wc-app-header__actions">{actions}</div>
    </header>
  );
}
