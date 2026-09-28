import { Logo, Wordmark } from '@wasabi-cross/ui';
import type { ReactNode } from 'react';
import { BRAND_SUBTITLE } from '../../app/shell/AppShell.tsx';
import './auth.css';

export interface AuthScreenProps {
  /** El "Welcome back!" / "Welcome!" de los mockups 2 y 3. */
  greeting: string;
  title: string;
  children: ReactNode;
  /** El link al otro lado: de login a registro y viceversa. */
  footer: ReactNode;
}

/**
 * La pantalla de login y la de registro comparten todo menos el formulario (mockups 2 y 3),
 * con la marca del header del diseño arriba: sin sesión no hay header.
 */
export function AuthScreen({
  greeting,
  title,
  children,
  footer,
}: AuthScreenProps): React.JSX.Element {
  return (
    <main className="wc-root auth">
      <div className="auth__brand">
        <Logo />
        <Wordmark subtitle={BRAND_SUBTITLE} />
      </div>

      <div className="auth__head">
        <p className="wc-kicker auth__greeting">{greeting}</p>
        <h1 className="auth__title">{title}</h1>
      </div>

      {children}

      <p className="auth__footer">{footer}</p>
    </main>
  );
}
