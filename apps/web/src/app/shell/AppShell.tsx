import { Link } from '@tanstack/react-router';
import type { Theme } from '@wasabi-cross/schemas';
import { AppHeader, Drawer, IconButton, Logo, MenuIcon, ThemeToggle } from '@wasabi-cross/ui';
import { useState, type ReactNode } from 'react';
import { ErrorNotice } from '../ErrorNotice.tsx';

export interface AppShellProps {
  children: ReactNode;
  /** El tema llega de afuera: con sesión lo guarda la API, no el dispositivo (F1-16). */
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSignOut: () => void;
  signingOut: boolean;
  signOutError: unknown;
}

/*
 * Del menú del mockup 4a quedan afuera, por ahora, "Estadísticas" (es de la próxima fase) y
 * "Color" (llega con el perfil, F1-16). Un link que no lleva a nada es peor que no tenerlo.
 */

/** Header y menú, presentes en todas las páginas con sesión (spec §5). */
export function AppShell({
  children,
  theme,
  onThemeChange,
  onSignOut,
  signingOut,
  signOutError,
}: AppShellProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="wc-root app-shell">
      <AppHeader
        brand={
          <Link to="/">
            <Logo />
            Wasabi Cross
          </Link>
        }
        actions={
          <>
            <ThemeToggle
              theme={theme}
              onToggle={() => {
                onThemeChange(theme === 'dark' ? 'light' : 'dark');
              }}
            />
            <IconButton
              label="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen(true);
              }}
            >
              <MenuIcon />
            </IconButton>
          </>
        }
      />

      <Drawer open={menuOpen} onClose={closeMenu} label="Menú principal" closeLabel="Cerrar menú">
        <nav aria-label="Principal">
          <Link
            to="/"
            className="wc-drawer__item"
            activeOptions={{ exact: true }}
            activeProps={{ 'aria-current': 'page' }}
            onClick={closeMenu}
          >
            Tus ejercicios
          </Link>
          <Link
            to="/estadisticas"
            className="wc-drawer__item"
            activeProps={{ 'aria-current': 'page' }}
            onClick={closeMenu}
          >
            Estadísticas
          </Link>
          <Link
            to="/perfil"
            className="wc-drawer__item"
            activeProps={{ 'aria-current': 'page' }}
            onClick={closeMenu}
          >
            Perfil
          </Link>
        </nav>
        <div className="wc-drawer__footer">
          {signOutError ? <ErrorNotice error={signOutError} /> : null}
          <button
            type="button"
            className="wc-drawer__item"
            disabled={signingOut}
            onClick={onSignOut}
          >
            Cerrar sesión
          </button>
        </div>
      </Drawer>

      <main className="app-shell__main">{children}</main>
    </div>
  );
}
