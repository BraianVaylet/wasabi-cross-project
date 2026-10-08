import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './ProviderButton.css';

/**
 * Qué marca lleva el botón. `google` y `microsoft` usan el logo y los colores de sus lineamientos
 * de marca, sin tocarlos; `generic` es para lo que no tiene marca (el ingreso de desarrollo).
 */
export type ProviderMark = 'google' | 'microsoft' | 'generic';

export interface ProviderButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  provider: ProviderMark;
  /** El texto completo, como lo piden los lineamientos de cada marca: "Continuar con Google". */
  children: ReactNode;
}

/** La "G" de Google: cuatro trazos, con los colores y las proporciones de su guía de marca. */
function GoogleLogo(): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Los cuatro cuadrados de Microsoft, de 9px con 1px de separación, en sus cuatro colores. */
function MicrosoftLogo(): React.JSX.Element {
  return (
    <svg viewBox="0 0 21 21" focusable="false" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

/** Una llave, del color del texto: para el proveedor que no tiene logo. */
function GenericLogo(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3M14 9l2 2" />
    </svg>
  );
}

const LOGOS = {
  google: GoogleLogo,
  microsoft: MicrosoftLogo,
  generic: GenericLogo,
} as const satisfies Record<ProviderMark, () => React.JSX.Element>;

/**
 * El botón de "Continuar con…" de la pantalla de ingreso (spec §5.6). Sólo presentación: qué
 * proveedores hay y qué pasa al apretarlo lo decide quien lo usa. Va a todo el ancho de su columna.
 */
export function ProviderButton({
  provider,
  className,
  type = 'button',
  children,
  ...rest
}: ProviderButtonProps): React.JSX.Element {
  const Logo = LOGOS[provider];
  const classes = ['wc-provider-button', `wc-provider-button--${provider}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      <span className="wc-provider-button__logo">
        <Logo />
      </span>
      <span className="wc-provider-button__label">{children}</span>
    </button>
  );
}
